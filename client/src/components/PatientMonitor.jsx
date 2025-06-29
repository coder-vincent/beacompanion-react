import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import {
  Play,
  Pause,
  Square,
  Activity,
  Eye,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  TrendingUp,
  BarChart3,
  Settings,
} from "lucide-react";
import { Pose } from "@mediapipe/pose";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

const PatientMonitor = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [behaviorData, setBehaviorData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const monitoringInterval = useRef(null);
  const dataCollectionInterval = useRef(null);

  const videoRef = useRef(null);
  const [poseLandmarks, setPoseLandmarks] = useState([]);
  const [faceLandmarks, setFaceLandmarks] = useState([]);
  const [handLandmarks, setHandLandmarks] = useState([]);

  const poseBuffer = useRef([]);
  const handBuffer = useRef([]);
  const faceBuffer = useRef([]);

  // Behavior types and their thresholds
  const behaviorTypes = {
    eye_gaze: { name: "Eye Gaze", threshold: 0.7, color: "bg-blue-500" },
    sit_stand: { name: "Sit-Stand", threshold: 0.6, color: "bg-green-500" },
    tapping_hands: {
      name: "Hand Tapping",
      threshold: 0.65,
      color: "bg-yellow-500",
    },
    tapping_feet: {
      name: "Foot Tapping",
      threshold: 0.65,
      color: "bg-orange-500",
    },
    rapid_talking: {
      name: "Rapid Talking",
      threshold: 0.75,
      color: "bg-purple-500",
    },
  };

  // Fetch patients on component mount
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch("/api/user/all", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        const patientUsers = data.users.filter(
          (user) => user.role === "patient"
        );
        setPatients(patientUsers);
        if (patientUsers.length > 0) {
          setSelectedPatient(patientUsers[0]);
        }
      }
    } catch (err) {
      setError("Failed to fetch patients: " + err.message);
    }
  };

  const startMonitoring = async () => {
    if (!selectedPatient) {
      setError("Please select a patient to monitor");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create new monitoring session
      const sessionData = {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        startTime: new Date().toISOString(),
        status: "active",
      };

      const response = await fetch("/api/ml/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        const session = await response.json();
        setCurrentSession(session);
        setIsMonitoring(true);

        // Initialize behavior data
        setBehaviorData({
          eye_gaze: { count: 0, lastDetection: null, severity: 0 },
          sit_stand: { count: 0, lastDetection: null, severity: 0 },
          tapping_hands: { count: 0, lastDetection: null, severity: 0 },
          tapping_feet: { count: 0, lastDetection: null, severity: 0 },
          rapid_talking: { count: 0, lastDetection: null, severity: 0 },
        });

        // Start monitoring intervals
        startDataCollection();
        startBehaviorAnalysis();

        setAlerts([
          {
            id: Date.now(),
            type: "info",
            message: `Started monitoring ${selectedPatient.name}`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setError("Failed to start monitoring session");
      }
    } catch (err) {
      setError("Error starting monitoring: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const stopMonitoring = async () => {
    if (!currentSession) return;

    setLoading(true);

    try {
      // Stop intervals
      if (monitoringInterval.current) {
        clearInterval(monitoringInterval.current);
      }
      if (dataCollectionInterval.current) {
        clearInterval(dataCollectionInterval.current);
      }

      // End session
      const response = await fetch(`/api/ml/session/${currentSession.id}/end`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const endedSession = await response.json();
        setSessionHistory((prev) => [endedSession, ...prev]);

        setAlerts((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "info",
            message: `Stopped monitoring ${selectedPatient.name}`,
            timestamp: new Date(),
          },
        ]);
      }

      setIsMonitoring(false);
      setCurrentSession(null);
      setBehaviorData({});
    } catch (err) {
      setError("Error stopping monitoring: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startDataCollection = () => {
    // Collect data every 5 seconds (reduced frequency)
    dataCollectionInterval.current = setInterval(() => {
      collectAndAnalyzeData();
    }, 5000);
  };

  const startBehaviorAnalysis = () => {
    // Analyze behavior patterns every 30 seconds
    monitoringInterval.current = setInterval(() => {
      analyzeBehaviorPatterns();
    }, 30000);
  };

  const collectAndAnalyzeData = async () => {
    try {
      // 1. Check if buffers have enough data (10 frames)
      const poseReady = poseBuffer.current.length === 10;
      const handReady = handBuffer.current.length === 10;
      const faceReady = faceBuffer.current.length === 10;

      // 2. Format landmark data, sending null if not enough frames are ready
      // Correct format for sit_stand model: [10, 66] (33 landmarks * 2 xy-coords)
      const poseData = poseReady
        ? poseBuffer.current.map((frame) =>
            frame.flatMap((pt) => [pt.x ?? 0, pt.y ?? 0])
          )
        : null;

      // NOTE: tapping_hands model expects images, but we send landmarks for efficiency.
      const handData = handReady
        ? handBuffer.current.map((frame) => {
            const firstHand = frame[0]; // Use the first detected hand
            if (!firstHand) return Array(63).fill(0); // Pad with zeros if no hand
            return firstHand.flatMap((pt) => [pt.x ?? 0, pt.y ?? 0, pt.z ?? 0]);
          })
        : null;

      // NOTE: eye_gaze model expects images, but we send landmarks for efficiency.
      const faceData = faceReady
        ? faceBuffer.current.map((frame) =>
            frame.flatMap((pt) => [pt.x ?? 0, pt.y ?? 0])
          )
        : null;

      // Add detailed logging for debugging sit_stand
      if (poseData) {
        console.log(
          "Debug: Sit-Stand Data Shape:",
          `[${poseData.length}, ${poseData[0]?.length || 0}]`
        );
        console.log("Debug: Sit-Stand Data Sample (first frame):", poseData[0]);
      } else {
        console.log("Debug: Sit-Stand data is null (buffer not ready).");
      }

      // Using dummy data for audio features as it requires separate hardware/setup
      const audioData = [120, 0.5, 140, 0.3, 110, 0.8];

      const behaviorsToAnalyze = [
        { type: "sit_stand", data: poseData },
        { type: "tapping_feet", data: poseData }, // Reusing pose data; model expects images
        { type: "tapping_hands", data: handData },
        { type: "eye_gaze", data: faceData },
        { type: "rapid_talking", data: audioData },
      ];

      // 3. Filter out behaviors that don't have enough data yet
      const readyBehaviors = behaviorsToAnalyze.filter((b) => b.data !== null);

      if (readyBehaviors.length === 0) {
        // This is normal and expected when the monitor first starts.
        // console.log("Collecting data... buffers not full yet.");
        return;
      }

      // Deep log the data being sent for validation.
      console.log(
        `Sending ${readyBehaviors.length} behaviors to backend. Payload:`,
        JSON.parse(JSON.stringify(readyBehaviors))
      );

      const response = await fetch("/api/ml/batch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ behaviors: readyBehaviors }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Backend analysis results:", result);

        if (result.success && result.results) {
          updateBehaviorData(result.results);
        } else {
          console.error("Backend returned an error during analysis:", result);
        }
      } else {
        const errorData = await response.json();
        console.error("Failed to send data to backend:", errorData);
      }
    } catch (err) {
      console.error(
        "An error occurred during data collection and analysis:",
        err
      );
    }
  };

  const updateBehaviorData = (results) => {
    setBehaviorData((prev) => {
      const updated = { ...prev };

      results.forEach((result) => {
        if (result.behavior_type && !result.error) {
          const behavior = result.behavior_type;
          const detected = result.detected;
          const confidence = result.confidence || 0;

          if (detected) {
            updated[behavior] = {
              count: (updated[behavior]?.count || 0) + 1,
              lastDetection: new Date(),
              severity: Math.max(updated[behavior]?.severity || 0, confidence),
            };

            // Create alert for high-severity detections
            if (confidence > behaviorTypes[behavior].threshold) {
              setAlerts((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  type: "warning",
                  message: `High ${behaviorTypes[behavior].name} activity detected`,
                  timestamp: new Date(),
                  behavior: behavior,
                  confidence: confidence,
                },
              ]);
            }
          }
        } else if (result.error) {
          console.error(
            `Error analyzing ${result.behavior_type}:`,
            result.error
          );
        }
      });

      return updated;
    });
  };

  const analyzeBehaviorPatterns = () => {
    // Analyze overall patterns and create insights
    const totalDetections = Object.values(behaviorData).reduce(
      (sum, data) => sum + data.count,
      0
    );

    if (totalDetections > 10) {
      setAlerts((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "info",
          message: `High activity period detected: ${totalDetections} behaviors in last 30 seconds`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  const getBehaviorStatus = (behavior) => {
    const data = behaviorData[behavior];
    if (!data)
      return {
        status: "normal",
        text: "Normal",
        color: "bg-gray-100 text-gray-800",
      };

    if (data.severity > behaviorTypes[behavior].threshold) {
      return {
        status: "high",
        text: "High Activity",
        color: "bg-red-100 text-red-800",
      };
    } else if (data.count > 3) {
      return {
        status: "moderate",
        text: "Moderate Activity",
        color: "bg-yellow-100 text-yellow-800",
      };
    } else {
      return {
        status: "normal",
        text: "Normal",
        color: "bg-green-100 text-green-800",
      };
    }
  };

  const getSessionDuration = () => {
    if (!currentSession?.startTime) return "00:00:00";

    const start = new Date(currentSession.startTime);
    const now = new Date();
    const diff = now - start;

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Webcam setup
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });
  }, []);

  // Pose, Face, Hand detection setup
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Pose
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    pose.onResults((results) => {
      setPoseLandmarks(results.poseLandmarks || []);
    });

    // Face
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({ maxNumFaces: 1, minDetectionConfidence: 0.5 });
    faceMesh.onResults((results) => {
      setFaceLandmarks(results.multiFaceLandmarks?.[0] || []);
    });

    // Hands
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({ maxNumHands: 2, minDetectionConfidence: 0.5 });
    hands.onResults((results) => {
      setHandLandmarks(results.multiHandLandmarks || []);
    });

    // Camera
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await pose.send({ image: videoElement });
        await faceMesh.send({ image: videoElement });
        await hands.send({ image: videoElement });
      },
      width: 320,
      height: 240,
    });
    camera.start();
  }, []);

  // Collect and send real data to backend
  useEffect(() => {
    if (poseLandmarks && poseLandmarks.length > 0) {
      poseBuffer.current.push(poseLandmarks);
      if (poseBuffer.current.length > 10) poseBuffer.current.shift();
    }
    if (handLandmarks && handLandmarks.length > 0) {
      handBuffer.current.push(handLandmarks);
      if (handBuffer.current.length > 10) handBuffer.current.shift();
    }
    if (faceLandmarks && faceLandmarks.length > 0) {
      faceBuffer.current.push(faceLandmarks);
      if (faceBuffer.current.length > 10) faceBuffer.current.shift();
    }
  }, [poseLandmarks, handLandmarks, faceLandmarks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Patient Behavior Monitor
          </CardTitle>
          <CardDescription>
            Real-time monitoring of patient behavior using AI-powered analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Patient Selection */}
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium">Select Patient:</label>
            <select
              value={selectedPatient?.id || ""}
              onChange={(e) => {
                const patient = patients.find((p) => p.id === e.target.value);
                setSelectedPatient(patient);
              }}
              className="border rounded px-3 py-1"
              disabled={isMonitoring}
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>

          {/* Monitoring Controls */}
          <div className="flex items-center gap-4">
            <Button
              onClick={startMonitoring}
              disabled={loading || isMonitoring || !selectedPatient}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Monitoring
            </Button>

            <Button
              onClick={stopMonitoring}
              disabled={loading || !isMonitoring}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop Monitoring
            </Button>

            {isMonitoring && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{getSessionDuration()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Monitoring Dashboard */}
      {isMonitoring && (
        <Tabs defaultValue="live" className="space-y-4">
          <TabsList>
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Monitor
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alerts ({alerts.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Live Monitor Tab */}
          <TabsContent value="live" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(behaviorTypes).map(([key, config]) => {
                const data = behaviorData[key] || { count: 0, severity: 0 };
                const status = getBehaviorStatus(key);

                return (
                  <Card key={key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>{config.name}</span>
                        <Badge className={status.color}>{status.text}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Detections:</span>
                          <span className="font-mono">{data.count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Severity:</span>
                          <span className="font-mono">
                            {(data.severity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={data.severity * 100} className="h-2" />
                        {data.lastDetection && (
                          <div className="text-xs text-gray-500">
                            Last: {data.lastDetection.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Behavior Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No alerts yet
                    </p>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center gap-3 p-3 border rounded"
                      >
                        {alert.type === "warning" ? (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-gray-500">
                            {alert.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        {alert.confidence && (
                          <Badge variant="outline">
                            {(alert.confidence * 100).toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Session History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sessionHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No previous sessions
                    </p>
                  ) : (
                    sessionHistory.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div>
                          <p className="font-medium">{session.patientName}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(session.startTime).toLocaleDateString()} -
                            {new Date(session.endTime).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {session.duration || "N/A"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default PatientMonitor;
