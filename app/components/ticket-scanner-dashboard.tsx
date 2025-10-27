"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  CheckCircle,
  Download,
  Keyboard,
  Loader2,
  LogOut,
  Moon,
  Play,
  Scan,
  Settings,
  Square,
  Sun,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TicketResult {
  message: string;
  used: boolean | null;
  eventId?: string;
  buyerId?: string;
  eventName?: string;
  buyerName?: string;
  purchaseDate?: string;
  scanTime?: string;
}

interface ScanStats {
  totalScanned: number;
  validTickets: number;
  usedTickets: number;
  invalidTickets: number;
}

const TicketScannerDashboard = () => {
  const [data, setData] = useState("");
  const [result, setResult] = useState<TicketResult | null>(null);
  const [scanning, setScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState<
    { code: string; result: TicketResult; timestamp: Date }[]
  >([]);
  const [stats, setStats] = useState<ScanStats>({
    totalScanned: 0,
    validTickets: 0,
    usedTickets: 0,
    invalidTickets: 0,
  });
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastScannedRef = useRef<string>("");

  // Mock event data
  const eventData = {
    name: "Summer Music Festival 2024",
    logo: "/placeholder.svg?height=40&width=40",
    date: "July 15-17, 2024",
  };

  // ✅ Sound feedback
  const playSound = (type: "success" | "error") => {
    if (!soundEnabled) return;
    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "success") {
      osc.frequency.value = 900;
    } else {
      osc.frequency.value = 300;
    }

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  };

  // ✅ Stats update
  const updateStats = (r: TicketResult) => {
    setStats((prev) => ({
      totalScanned: prev.totalScanned + 1,
      validTickets: prev.validTickets + (r.used === false ? 1 : 0),
      usedTickets: prev.usedTickets + (r.used === true ? 1 : 0),
      invalidTickets: prev.invalidTickets + (r.used === null ? 1 : 0),
    }));
  };

  // ✅ Verify ticket API
  const processTicket = async (code: string) => {
    if (isLoading || !code) return;

    // prevent duplicate scan within 2 sec
    if (lastScannedRef.current === code) return;
    lastScannedRef.current = code;
    setTimeout(() => (lastScannedRef.current = ""), 2000);

    setData(code);
    setIsLoading(true);

    try {
      const res = await fetch("/api/tickets/verify-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketCode: code }),
      });

      const ticketResult: TicketResult = await res.json();
      ticketResult.scanTime = new Date().toLocaleTimeString();
      setResult(ticketResult);
      updateStats(ticketResult);

      playSound(ticketResult.used === false ? "success" : "error");

      setScanHistory((prev) => [
        { code, result: ticketResult, timestamp: new Date() },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      const errorResult = {
        message: "Server Error",
        used: null,
        scanTime: new Date().toLocaleTimeString(),
      };
      setResult(errorResult);
      updateStats(errorResult);
      playSound("error");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Manual Entry
  const handleManualScan = async () => {
    if (manualCode.trim()) {
      await processTicket(manualCode.trim());
      setManualCode("");
    }
  };

  // ✅ ZXing Scanner
  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    reader.timeBetweenScansMillis = 1000;

    if (scanning && videoRef.current) {
      reader.decodeFromVideoDevice(null, videoRef.current, (r, err) => {
        if (r) {
          processTicket(r.getText());
        }
      });
    }

    return () => {
      reader.reset();
    };
  }, [scanning]);

  const toggleScanning = () => {
    setScanning(!scanning);
    if (!scanning) setResult(null);
  };

  // ✅ CSV Export
  const downloadLogs = () => {
    const csv = [
      "Timestamp,Ticket Code,Status,Message",
      ...scanHistory.map(
        (s) =>
          `${s.timestamp.toISOString()},${s.code},${
            s.result.used === false
              ? "Valid"
              : s.result.used === true
              ? "Used"
              : "Invalid"
          },${s.result.message}`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scan_logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (used: boolean | null) => {
    if (used === false)
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          ✓ Valid
        </Badge>
      );
    if (used === true)
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          ✗ Used
        </Badge>
      );
    return (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
        ✗ Invalid
      </Badge>
    );
  };

  const getStatusIcon = (used: boolean | null) => {
    if (used === false)
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    if (used === true) return <XCircle className="h-6 w-6 text-red-500" />;
    return <XCircle className="h-6 w-6 text-gray-500" />;
  };

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "dark bg-gray-900"
          : "bg-gradient-to-br from-blue-50 to-indigo-100"
      }`}
    >
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img
                src={eventData.logo}
                alt="Logo"
                className="h-10 w-10 rounded-lg"
              />
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {eventData.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {eventData.date}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Section */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Scanner & Result */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-gray-900 dark:text-white">
                  <Scan className="h-5 w-5" /> Ticket Scanner
                </CardTitle>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button
                    onClick={toggleScanning}
                    variant={scanning ? "destructive" : "default"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {scanning ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {scanning ? "Stop Scan" : "Start Scan"}
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={manualEntry}
                      onCheckedChange={setManualEntry}
                    />
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Manual Entry
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {manualEntry ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter ticket code manually"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleManualScan()
                      }
                    />
                    <Button
                      onClick={handleManualScan}
                      disabled={!manualCode.trim() || isLoading}
                    >
                      <Keyboard className="h-4 w-4 mr-2" /> Scan
                    </Button>
                  </div>
                ) : (
                  <div
                    className="relative bg-black rounded-lg overflow-hidden"
                    style={{ aspectRatio: "4/3" }}
                  >
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      autoPlay
                    />
                    {isLoading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p>Verifying ticket...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {data && (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Last Scanned Code:
                    </p>
                    <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
                      {data}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {result && (
              <Card
                className={`shadow-lg ${
                  result.used === false
                    ? "border-green-200 bg-green-50 dark:bg-green-900/20"
                    : result.used === true
                    ? "border-red-200 bg-red-50 dark:bg-red-900/20"
                    : "border-gray-200 bg-gray-50 dark:bg-gray-800"
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {getStatusIcon(result.used)}
                    <span>Verification Result</span>
                    {getStatusBadge(result.used)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium">{result.message}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Stats & Logs */}
          <div className="space-y-6">
            <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle>Today's Stats</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Stat label="Total" value={stats.totalScanned} color="blue" />
                <Stat label="Valid" value={stats.validTickets} color="green" />
                <Stat label="Used" value={stats.usedTickets} color="red" />
                <Stat
                  label="Invalid"
                  value={stats.invalidTickets}
                  color="gray"
                />
              </CardContent>
            </Card>

            <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex justify-between items-center">
                <CardTitle>Recent Scans</CardTitle>
                <Button variant="ghost" size="sm" onClick={downloadLogs}>
                  <Download className="h-4 w-4" /> Export
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                {scanHistory.length > 0 ? (
                  scanHistory.map((s, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg flex justify-between items-center ${
                        s.result.used === false
                          ? "bg-green-50 dark:bg-green-900/20"
                          : s.result.used === true
                          ? "bg-red-50 dark:bg-red-900/20"
                          : "bg-gray-50 dark:bg-gray-800"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-mono truncate">{s.code}</p>
                        <p className="text-xs text-gray-500">
                          {s.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {getStatusBadge(s.result.used)}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No scans yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <div
    className={`text-center p-3 rounded-lg bg-${color}-50 dark:bg-${color}-900/20`}
  >
    <p
      className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}
    >
      {value}
    </p>
    <p className={`text-xs text-${color}-600 dark:text-${color}-400`}>
      {label}
    </p>
  </div>
);

export default TicketScannerDashboard;
