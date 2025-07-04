import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ML Model Test Controller
export const testModels = async (req, res) => {
  try {
    console.log("Testing ML models...");

    const pythonScript = path.join(
      __dirname,
      "../../machine-learning/utils/health_check.py"
    );
    const workingDir = path.join(__dirname, "../../machine-learning");

    console.log("Python script path:", pythonScript);
    console.log("Working directory:", workingDir);

    // Check if script exists
    if (!fs.existsSync(pythonScript)) {
      return res.status(500).json({
        success: false,
        message: "Test script not found",
        script_path: pythonScript,
      });
    }

    const pythonProcess = spawn("python", [pythonScript], {
      cwd: workingDir,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Short timeout for health check - 10 seconds
    const timeout = setTimeout(() => {
      pythonProcess.kill("SIGTERM");
      console.error("Health check timed out after 10 seconds");
      res.status(408).json({
        success: false,
        message: "Model test timed out",
      });
    }, 10 * 1000); // 10 seconds

    let result = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
      console.log("Python test stderr:", data.toString());
    });

    pythonProcess.on("close", (code) => {
      clearTimeout(timeout);

      console.log(`Test process exited with code: ${code}`);
      console.log(`Test stdout: "${result}"`);
      console.log(`Test stderr: "${error}"`);

      if (code !== 0) {
        console.error("Python test script error:", error);
        return res.status(500).json({
          success: false,
          message: "ML test failed",
          error: error,
        });
      }

      try {
        if (!result.trim()) {
          console.error("Python test script returned empty result");
          return res.status(500).json({
            success: false,
            message: "ML test returned empty result",
          });
        }

        const testResult = JSON.parse(result);
        console.log("Parsed test result:", testResult);

        if (testResult.status === "success") {
          res.json({
            success: true,
            test_result: testResult,
            message: "ML environment test completed successfully",
          });
        } else {
          res.status(500).json({
            success: false,
            message: testResult.message || "ML test failed",
            error: testResult.error,
          });
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Raw result:", result);
        res.status(500).json({
          success: false,
          message: "Failed to parse test result",
          error: parseError.message,
        });
      }
    });

    pythonProcess.on("error", (error) => {
      clearTimeout(timeout);
      console.error("Failed to start Python process:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start Python process",
        error: error.message,
      });
    });
  } catch (error) {
    console.error("Test controller error:", error);
    res.status(500).json({
      success: false,
      message: "Model test failed",
      error: error.message,
    });
  }
};

// ML Analysis Controller
export const analyzeBehavior = async (req, res) => {
  try {
    // Support both camelCase and snake_case keys coming from frontend / tests
    const behaviorType = req.body.behaviorType || req.body.behavior_type;
    const data =
      req.body.data !== undefined ? req.body.data : req.body.payload || null;
    // Frame or sequence may come in different casings
    const frame = req.body.frame || req.body.Frame || null;
    const frame_sequence =
      req.body.frame_sequence || req.body.frameSequence || null;

    // Validate request body size
    const contentLength = req.headers["content-length"];
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      // 50MB limit
      return res.status(413).json({
        success: false,
        message: "Request payload too large. Maximum size is 50MB.",
      });
    }

    const pythonScript = path.join(
      __dirname,
      "../../machine-learning/utils/ml_analyzer.py"
    );
    const workingDir = path.join(__dirname, "../../machine-learning");

    if (!behaviorType || (!data && !frame && !frame_sequence)) {
      return res.status(400).json({
        success: false,
        message:
          "Behavior type and data, frame, or frame_sequence are required",
      });
    }

    // Validate behavior type
    const validTypes = [
      "eye_gaze",
      "sit_stand",
      "tapping_hands",
      "tapping_feet",
      "rapid_talking",
    ];
    if (!validTypes.includes(behaviorType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid behavior type",
      });
    }

    // Use data if present, otherwise use frame or frame_sequence
    const payload = data || frame || frame_sequence;

    // Validate payload size
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 50 * 1024 * 1024) {
      // 50MB limit
      return res.status(413).json({
        success: false,
        message: "Data payload too large. Maximum size is 50MB.",
      });
    }

    // Create a temporary file to store the data
    const tempFile = path.join(os.tmpdir(), `ml_data_${Date.now()}.json`);

    try {
      // Format data for the specific behavior type
      let formattedData;
      if (frame || frame_sequence) {
        // If we have frame data, format it for the specific behavior type
        formattedData = {
          [behaviorType]: frame || frame_sequence,
        };
      } else if (data) {
        // If we have structured data, format it for the specific behavior type
        formattedData = {
          [behaviorType]: data,
        };
      } else {
        throw new Error("No data, frame, or frame_sequence provided");
      }

      // Write data to temporary file
      fs.writeFileSync(tempFile, JSON.stringify(formattedData));

      // Debug logging
      console.log("ML Analysis Debug:");
      console.log("- Behavior Type:", behaviorType);
      console.log("- Temp File:", tempFile);
      console.log("- Python Script:", pythonScript);
      console.log("- Working Dir:", workingDir);
      console.log("- Formatted Data Keys:", Object.keys(formattedData));
      console.log(
        "- Payload Size:",
        (payloadSize / 1024 / 1024).toFixed(2),
        "MB"
      );

      // Use command line arguments for behavior type and file path
      const args = [
        pythonScript,
        "--data",
        tempFile,
        "--behavior",
        behaviorType,
      ];
      console.log("- Python Args:", args);

      const pythonProcess = spawn("python", args, {
        cwd: workingDir,
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Set a timeout for the Python process (60 seconds)
      const timeout = setTimeout(() => {
        pythonProcess.kill("SIGTERM");
        console.error("Python process timed out after 60 seconds");
        res.status(408).json({
          success: false,
          message:
            "ML analysis timed out. Please try with smaller data or contact support.",
        });
      }, 60 * 1000); // 60 seconds

      let result = "";
      let error = "";

      pythonProcess.stdout.on("data", (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        error += data.toString();
        // Log full stderr output for debugging
        console.error("Python script stderr:", data.toString());
      });

      pythonProcess.on("close", (code) => {
        // Clear the timeout
        clearTimeout(timeout);

        // Clean up temporary file
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          console.error("Failed to cleanup temp file:", cleanupError);
        }

        // Debug logging
        console.log(`Python process exited with code: ${code}`);
        console.log(`Python stdout: "${result}"`);
        console.log(`Python stderr: "${error}"`);

        if (code !== 0) {
          console.error("Python script error:", error);
          return res.status(500).json({
            success: false,
            message: "ML analysis failed",
            error: error,
          });
        }

        try {
          if (!result.trim()) {
            console.error("Python script returned empty result");
            return res.status(500).json({
              success: false,
              message: "ML analysis returned empty result",
              error: "No output from Python script",
            });
          }

          let analysisResult = JSON.parse(result);

          // Ensure behavior_type key is present for frontend compatibility
          analysisResult = {
            behavior_type: behaviorType,
            ...analysisResult,
          };

          console.log("Parsed analysis result:", analysisResult);
          res.json({
            success: true,
            analysis: analysisResult,
          });
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          console.error("Raw result:", result);
          res.status(500).json({
            success: false,
            message: "Failed to parse ML results",
            error: parseError.message,
          });
        }
      });

      pythonProcess.on("error", (err) => {
        // Clear the timeout
        clearTimeout(timeout);

        // Clean up temporary file on error
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          console.error("Failed to cleanup temp file:", cleanupError);
        }

        console.error("Failed to start Python process:", err);
        res.status(500).json({
          success: false,
          message: "Failed to start ML analysis",
          error: err.message,
        });
      });
    } catch (fileError) {
      console.error("File operation error:", fileError);
      res.status(500).json({
        success: false,
        message: "Failed to prepare data for ML analysis",
        error: fileError.message,
      });
    }
  } catch (error) {
    console.error("ML Controller Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get ML model status
export const getModelStatus = async (req, res) => {
  try {
    const pythonScript = path.join(
      __dirname,
      "../../machine-learning/utils/model_status.py"
    );

    // Set the working directory to the machine-learning folder
    const workingDir = path.join(__dirname, "../../machine-learning");

    const pythonProcess = spawn("python", [pythonScript], {
      cwd: workingDir,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let result = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("Python script error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to get model status",
          error: error,
        });
      }

      try {
        const status = JSON.parse(result);
        res.json({
          success: true,
          models: status,
        });
      } catch (parseError) {
        res.status(500).json({
          success: false,
          message: "Failed to parse model status",
          error: parseError.message,
        });
      }
    });

    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python process:", err);
      res.status(500).json({
        success: false,
        message: "Failed to get model status",
        error: err.message,
      });
    });
  } catch (error) {
    console.error("Model Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Batch analysis for multiple behaviors
export const batchAnalysis = async (req, res) => {
  try {
    const { behaviors } = req.body;

    if (!behaviors || !Array.isArray(behaviors)) {
      return res.status(400).json({
        success: false,
        message: "Behaviors array is required",
      });
    }

    // Create a temporary file to store the behaviors data
    const tempFile = path.join(os.tmpdir(), `batch_data_${Date.now()}.json`);

    try {
      // Write behaviors data to temporary file
      fs.writeFileSync(tempFile, JSON.stringify(behaviors));

      const pythonScript = path.join(
        __dirname,
        "../../machine-learning/utils/batch_analyzer.py"
      );

      // Set the working directory to the machine-learning folder
      const workingDir = path.join(__dirname, "../../machine-learning");

      const pythonProcess = spawn("python", [pythonScript, tempFile], {
        cwd: workingDir,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let result = "";
      let error = "";

      pythonProcess.stdout.on("data", (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        error += data.toString();
      });

      pythonProcess.on("close", (code) => {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          console.error("Failed to cleanup temp file:", cleanupError);
        }

        if (code !== 0) {
          console.error("Python script error:", error);
          return res.status(500).json({
            success: false,
            message: "Batch analysis failed",
            error: error,
          });
        }

        try {
          const batchResult = JSON.parse(result);

          // `batchResult` looks like { success: bool, results: [...], total_analyzed: n }
          // For consistency with /api/ml/analyze, flatten it so the client gets
          // { success, results: [...], total_analyzed }
          res.json({
            success: Boolean(batchResult.success),
            results: batchResult.results || [],
            total_analyzed: batchResult.total_analyzed || 0,
          });
        } catch (parseError) {
          res.status(500).json({
            success: false,
            message: "Failed to parse batch results",
            error: parseError.message,
          });
        }
      });

      pythonProcess.on("error", (err) => {
        // Clean up temporary file on error
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          console.error("Failed to cleanup temp file:", cleanupError);
        }

        console.error("Failed to start Python process:", err);
        res.status(500).json({
          success: false,
          message: "Failed to start batch analysis",
          error: err.message,
        });
      });
    } catch (fileError) {
      console.error("File operation error:", fileError);
      res.status(500).json({
        success: false,
        message: "Failed to prepare data for batch analysis",
        error: fileError.message,
      });
    }
  } catch (error) {
    console.error("Batch Analysis Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Evaluate labeled dataset and return accuracy metrics
export const evaluateDataset = async (req, res) => {
  try {
    const { behaviors } = req.body;

    if (!behaviors || !Array.isArray(behaviors) || behaviors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Behaviors (non-empty array) are required for evaluation",
      });
    }

    // Separate labels; batch_analyzer only needs type/data
    const unlabeled = behaviors.map((b) => ({ type: b.type, data: b.data }));

    const tempFile = path.join(os.tmpdir(), `eval_data_${Date.now()}.json`);

    fs.writeFileSync(tempFile, JSON.stringify(unlabeled));

    const pythonScript = path.join(
      __dirname,
      "../../machine-learning/utils/batch_analyzer.py"
    );

    const workingDir = path.join(__dirname, "../../machine-learning");

    const pythonProcess = spawn("python", [pythonScript, tempFile], {
      cwd: workingDir,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let result = "";
    let error = "";

    pythonProcess.stdout.on("data", (d) => (result += d.toString()));
    pythonProcess.stderr.on("data", (d) => (error += d.toString()));

    pythonProcess.on("close", (code) => {
      fs.unlink(tempFile, () => {});

      if (code !== 0) {
        return res.status(500).json({
          success: false,
          message: "Evaluation failed",
          error,
        });
      }

      try {
        const batchRes = JSON.parse(result);
        const predictions = batchRes.results || [];

        let correct = 0;
        predictions.forEach((pred, idx) => {
          const expectedLabel = behaviors[idx].label;
          if (expectedLabel !== undefined) {
            const matches = pred.label == expectedLabel;
            if (matches) correct += 1;
          }
        });

        const totalLabeled = behaviors.filter(
          (b) => b.label !== undefined
        ).length;

        const accuracy = totalLabeled ? correct / totalLabeled : null;

        res.json({
          success: true,
          total_samples: behaviors.length,
          labeled_samples: totalLabeled,
          correct,
          accuracy,
          predictions,
        });
      } catch (e) {
        res
          .status(500)
          .json({ success: false, message: "Parse error", error: e.message });
      }
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
