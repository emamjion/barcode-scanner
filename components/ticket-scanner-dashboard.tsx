"use client"

import { useState, useEffect } from "react"
import BarcodeScannerComponent from "react-qr-barcode-scanner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  CheckCircle,
  XCircle,
  Scan,
  User,
  Calendar,
  Loader2,
  Settings,
  LogOut,
  Download,
  Moon,
  Sun,
  Play,
  Square,
  Volume2,
  VolumeX,
  Keyboard,
} from "lucide-react"

interface TicketResult {
  message: string
  used: boolean | null
  eventId?: string
  buyerId?: string
  eventName?: string
  buyerName?: string
  purchaseDate?: string
  scanTime?: string
}

interface ScanStats {
  totalScanned: number
  validTickets: number
  usedTickets: number
  invalidTickets: number
}

const TicketScannerDashboard = () => {
  const [data, setData] = useState<string>("")
  const [result, setResult] = useState<TicketResult | null>(null)
  const [scanning, setScanning] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [scanHistory, setScanHistory] = useState<Array<{ code: string; result: TicketResult; timestamp: Date }>>([])
  const [stats, setStats] = useState<ScanStats>({ totalScanned: 0, validTickets: 0, usedTickets: 0, invalidTickets: 0 })
  const [darkMode, setDarkMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualCode, setManualCode] = useState("")

  // Mock event data
  const eventData = {
    name: "Summer Music Festival 2024",
    logo: "/placeholder.svg?height=40&width=40",
    date: "July 15-17, 2024",
  }

  // Sound effects
  const playSound = (type: "success" | "error") => {
    if (!soundEnabled) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    if (type === "success") {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
    } else {
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1)
    }

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  }

  const updateStats = (result: TicketResult) => {
    setStats((prev) => ({
      totalScanned: prev.totalScanned + 1,
      validTickets: prev.validTickets + (result.used === false ? 1 : 0),
      usedTickets: prev.usedTickets + (result.used === true ? 1 : 0),
      invalidTickets: prev.invalidTickets + (result.used === null ? 1 : 0),
    }))
  }

  const handleScan = async (err: any, scannedData: any) => {
    if (scannedData && scanning && !isLoading) {
      await processTicket(scannedData.text)
    }
  }

  const handleManualScan = async () => {
    if (manualCode.trim()) {
      await processTicket(manualCode.trim())
      setManualCode("")
    }
  }

  const processTicket = async (code: string) => {
    setData(code)
    setScanning(false)
    setIsLoading(true)

    try {
      const res = await fetch("/api/tickets/verify-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticketCode: code }),
      })

      const ticketResult = await res.json()
      ticketResult.scanTime = new Date().toLocaleTimeString()
      setResult(ticketResult)
      updateStats(ticketResult)

      // Play sound feedback
      if (ticketResult.used === false) {
        playSound("success")
      } else {
        playSound("error")
      }

      // Add to scan history
      setScanHistory((prev) => [
        {
          code,
          result: ticketResult,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ])
    } catch (error) {
      console.error("Error verifying ticket:", error)
      const errorResult = { message: "Server Error", used: null, scanTime: new Date().toLocaleTimeString() }
      setResult(errorResult)
      updateStats(errorResult)
      playSound("error")
    }

    setIsLoading(false)

    // Auto-resume scanning after 2 seconds
    setTimeout(() => {
      setScanning(true)
      if (!manualEntry) {
        setResult(null)
        setData("")
      }
    }, 2000)
  }

  const toggleScanning = () => {
    setScanning(!scanning)
    if (scanning) {
      setResult(null)
      setData("")
    }
  }

  const downloadLogs = () => {
    const csvContent = [
      "Timestamp,Ticket Code,Status,Message,Event ID,Buyer ID",
      ...scanHistory.map(
        (scan) =>
          `${scan.timestamp.toISOString()},${scan.code},${scan.result.used === false ? "Valid" : scan.result.used === true ? "Used" : "Invalid"},${scan.result.message},${scan.result.eventId || ""},${scan.result.buyerId || ""}`,
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `scan-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusIcon = (used: boolean | null) => {
    if (used === false) return <CheckCircle className="h-6 w-6 text-green-500" />
    if (used === true) return <XCircle className="h-6 w-6 text-red-500" />
    return <XCircle className="h-6 w-6 text-gray-500" />
  }

  const getStatusBadge = (used: boolean | null) => {
    if (used === false) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">✓ Valid</Badge>
    if (used === true) return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">✗ Used</Badge>
    return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">✗ Invalid</Badge>
  }

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${darkMode ? "dark bg-gray-900" : "bg-gradient-to-br from-blue-50 to-indigo-100"}`}
    >
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Event Info */}
            <div className="flex items-center space-x-4">
              <img src={eventData.logo || "/placeholder.svg"} alt="Event Logo" className="h-10 w-10 rounded-lg" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{eventData.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{eventData.date}</p>
              </div>
            </div>

            {/* User Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => setSoundEnabled(!soundEnabled)} className="p-2">
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)} className="p-2">
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=32&width=32" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" className="p-2">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Scanner Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Scanner Card */}
            <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-gray-900 dark:text-white">
                  <Scan className="h-5 w-5" />
                  Ticket Scanner
                </CardTitle>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button
                    onClick={toggleScanning}
                    variant={scanning ? "destructive" : "default"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {scanning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {scanning ? "Stop Scan" : "Start Scan"}
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Switch id="manual-mode" checked={manualEntry} onCheckedChange={setManualEntry} />
                    <label htmlFor="manual-mode" className="text-sm text-gray-600 dark:text-gray-400">
                      Manual Entry
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {manualEntry ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter ticket code manually"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleManualScan()}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                      <Button onClick={handleManualScan} disabled={!manualCode.trim() || isLoading}>
                        <Keyboard className="h-4 w-4 mr-2" />
                        Scan
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
                    {scanning ? (
                      <BarcodeScannerComponent width="100%" height={400} onUpdate={handleScan} />
                    ) : (
                      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                        <div className="text-white text-center">
                          <Scan className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Scanner Stopped</p>
                        </div>
                      </div>
                    )}
                    {isLoading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p>Verifying ticket...</p>
                        </div>
                      </div>
                    )}
                    {/* Scanner Frame Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-white opacity-50"></div>
                      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-white opacity-50"></div>
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-white opacity-50"></div>
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-white opacity-50"></div>
                    </div>
                  </div>
                )}

                {data && (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Scanned Code:</p>
                    <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">{data}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verification Result */}
            {result && (
              <Card
                className={`shadow-lg transition-all duration-300 ${
                  result.used === false
                    ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800"
                    : result.used === true
                      ? "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800"
                      : "border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {getStatusIcon(result.used)}
                    <span className="text-gray-900 dark:text-white">Verification Result</span>
                    {getStatusBadge(result.used)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-lg font-medium text-gray-900 dark:text-white">{result.message}</p>

                    {result.used !== null && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600 dark:text-gray-400">Buyer:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {result.buyerName || result.buyerId}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600 dark:text-gray-400">Event:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {result.eventName || result.eventId}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600 dark:text-gray-400">Scan Time:</span>
                              <span className="font-medium text-gray-900 dark:text-white">{result.scanTime}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600 dark:text-gray-400">Purchase Date:</span>
                              <span className="font-medium text-gray-900 dark:text-white">{result.purchaseDate}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Info Panel */}
          <div className="space-y-6">
            {/* Stats Card */}
            <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Today's Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalScanned}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Total Scanned</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.validTickets}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Valid Tickets</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.usedTickets}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">Already Used</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.invalidTickets}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Invalid</p>
                  </div>
                </div>
                <Button onClick={downloadLogs} className="w-full bg-transparent" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Scan Logs
                </Button>
              </CardContent>
            </Card>

            {/* Recent Scans */}
            {scanHistory.length > 0 && (
              <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Recent Scans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {scanHistory.slice(0, 5).map((scan, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(scan.result.used)}
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate">
                              {scan.code.length > 12 ? `${scan.code.substring(0, 12)}...` : scan.code}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {scan.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(scan.result.used)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TicketScannerDashboard
