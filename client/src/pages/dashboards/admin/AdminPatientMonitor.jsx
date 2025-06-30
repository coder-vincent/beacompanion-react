import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../../../context/AppContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Activity,
  Users,
  Clock,
  BarChart3,
  AlertTriangle,
  Eye,
  Brain,
  Settings,
  Download,
  Filter,
} from "lucide-react";
import PatientMonitor from "../../components/PatientMonitor";

const AdminPatientMonitor = () => {
  const { backendUrl } = useContext(AppContext);
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionStats, setSessionStats] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetchActiveSessions();
    fetchSessionStats();
  }, []);

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/session`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        const active = data.sessions.filter(
          (session) => session.status === "active"
        );
        setActiveSessions(active);
      }
    } catch (err) {
      setError("Failed to fetch active sessions: " + err.message);
    }
  };

  const fetchSessionStats = async () => {
    try {
      // This would be a new endpoint for session statistics
      const response = await fetch(`${backendUrl}/api/session/stats`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setSessionStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch session stats:", err);
    }
  };

  const exportSessionData = async (sessionId) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/session/${sessionId}/export`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session-${sessionId}-data.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError("Failed to export session data: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patient Monitoring Dashboard</h1>
          <p className="text-gray-600">
            Real-time monitoring and analysis of patient behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sessions
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Patients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessionStats.totalPatients || 0}
            </div>
            <p className="text-xs text-muted-foreground">Registered patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Session Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessionStats.averageDuration || "00:00:00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Per monitoring session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessionStats.highAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Today's high severity alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="monitor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Monitor
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active Sessions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Live Monitor Tab */}
        <TabsContent value="monitor" className="space-y-4">
          <PatientMonitor />
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Active Monitoring Sessions
              </CardTitle>
              <CardDescription>
                Currently active patient monitoring sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No active monitoring sessions</p>
                  <p className="text-sm text-gray-400">
                    Start monitoring a patient to see active sessions here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div>
                          <h3 className="font-medium">{session.patientName}</h3>
                          <p className="text-sm text-gray-500">
                            Started:{" "}
                            {new Date(session.startTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800"
                        >
                          Active
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportSessionData(session.id)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Export
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Behavior Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Behavior Distribution
                </CardTitle>
                <CardDescription>
                  Distribution of detected behaviors across all sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Eye Gaze", count: 45, color: "bg-blue-500" },
                    { name: "Sit-Stand", count: 32, color: "bg-green-500" },
                    { name: "Hand Tapping", count: 28, color: "bg-yellow-500" },
                    { name: "Foot Tapping", count: 23, color: "bg-orange-500" },
                    {
                      name: "Rapid Talking",
                      count: 19,
                      color: "bg-purple-500",
                    },
                  ].map((behavior, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${behavior.color}`}
                        ></div>
                        <span className="text-sm">{behavior.name}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {behavior.count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alert Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alert Trends
                </CardTitle>
                <CardDescription>
                  Alert frequency over the last 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { day: "Mon", alerts: 12, severity: "high" },
                    { day: "Tue", alerts: 8, severity: "medium" },
                    { day: "Wed", alerts: 15, severity: "high" },
                    { day: "Thu", alerts: 6, severity: "low" },
                    { day: "Fri", alerts: 11, severity: "medium" },
                    { day: "Sat", alerts: 4, severity: "low" },
                    { day: "Sun", alerts: 7, severity: "medium" },
                  ].map((day, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{day.day}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              day.severity === "high"
                                ? "bg-red-500"
                                : day.severity === "medium"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${(day.alerts / 15) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {day.alerts}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Session Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Session Performance Metrics
              </CardTitle>
              <CardDescription>
                Key performance indicators for monitoring sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">87%</div>
                  <p className="text-sm text-gray-600">Detection Accuracy</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">2.3s</div>
                  <p className="text-sm text-gray-600">Average Response Time</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">94%</div>
                  <p className="text-sm text-gray-600">System Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPatientMonitor;
