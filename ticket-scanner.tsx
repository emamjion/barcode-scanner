"use client"

import { useState } from "react"
import BarcodeScannerComponent from "react-qr-barcode-scanner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Scan, User, Calendar, Loader2 } from "lucide-react"

interface TicketResult {
  message: string
  used: boolean | null
  eventId?: string
  buyerId?: string
  eventName?: string
  buyerName?: string
  purchaseDate?: string
}

const TicketScanner = () => {
  const [data, setData] = useState<string>("Waiting for scan...")
  const [result, setResult] = useState<TicketResult | null>(null)
  const [scanning, setScanning] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [scanHistory, setScanHistory] = useState<Array<{ code: string; result: TicketResult; timestamp: Date }>>([])

  const handleScan = async (err: any, scannedData: any) => {
    if (scannedData && scanning && !isLoading) {
      const code = scannedData.text
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
        setResult(ticketResult)

        // Add to scan history
        setScanHistory((prev) => [
          {
            code,
            result: ticketResult,
            timestamp: new Date(),
          },
          ...prev.slice(0, 4),
        ]) // Keep only last 5 scans
      } catch (error) {
        console.error("Error verifying ticket:", error)
        const errorResult = { message: "Server Error", used: null }
        setResult(errorResult)
        setScanHistory((prev) => [
          {
            code,
            result: errorResult,
            timestamp: new Date(),
          },
          ...prev.slice(0, 4),
        ])
      }

      setIsLoading(false)

      // Rescan after 3 seconds
      setTimeout(() => {
        setScanning(true)
        setResult(null)
        setData("Waiting for scan...")
      }, 3000)
    }
  }

  const resetScanner = () => {
    setScanning(true)
    setResult(null)
    setData("Waiting for scan...")
    setIsLoading(false)
  }

  const getStatusIcon = (used: boolean | null) => {
    if (used === false) return <CheckCircle className="h-5 w-5 text-green-500" />
    if (used === true) return <XCircle className="h-5 w-5 text-red-500" />
    return <XCircle className="h-5 w-5 text-gray-500" />
  }

  const getStatusBadge = (used: boolean | null) => {
    if (used === false) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Valid</Badge>
    if (used === true) return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Used</Badge>
    return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Invalid</Badge>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ticket Scanner</h1>
          <p className="text-gray-600">Scan QR codes or barcodes to verify tickets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Scan className="h-5 w-5" />
                Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <BarcodeScannerComponent width="100%" height={300} onUpdate={handleScan} />
                {!scanning && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Processing...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Scanned Code:</p>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">{data}</p>
                <Button onClick={resetScanner} variant="outline" size="sm" disabled={scanning && !result}>
                  Reset Scanner
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Scan Result</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2">Verifying ticket...</span>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.used)}
                    <span className="font-medium">{result.message}</span>
                    {getStatusBadge(result.used)}
                  </div>

                  {result.used !== null && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">Ticket Details</h4>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Event ID:</span>
                            <span className="font-medium">{result.eventId}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Buyer ID:</span>
                            <span className="font-medium">{result.buyerId}</span>
                          </div>
                          {result.eventName && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Event:</span>
                              <span className="font-medium">{result.eventName}</span>
                            </div>
                          )}
                          {result.buyerName && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Buyer:</span>
                              <span className="font-medium">{result.buyerName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Scan className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Scan a ticket to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scanHistory.map((scan, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(scan.result.used)}
                      <div>
                        <p className="font-mono text-sm text-gray-600">
                          {scan.code.length > 20 ? `${scan.code.substring(0, 20)}...` : scan.code}
                        </p>
                        <p className="text-xs text-gray-500">{scan.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(scan.result.used)}
                      <p className="text-xs text-gray-500 mt-1">{scan.result.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default TicketScanner
