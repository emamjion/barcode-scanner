import { type NextRequest, NextResponse } from "next/server"

// Mock database - replace with your actual database
const mockTickets = [
  {
    code: "TICKET123",
    used: false,
    eventId: "EVT001",
    buyerId: "USER123",
    eventName: "Summer Music Festival 2024",
    buyerName: "John Doe",
    purchaseDate: "2024-01-15",
  },
  {
    code: "TICKET456",
    used: true,
    eventId: "EVT002",
    buyerId: "USER456",
    eventName: "Summer Music Festival 2024",
    buyerName: "Jane Smith",
    purchaseDate: "2024-01-10",
  },
  {
    code: "TICKET789",
    used: false,
    eventId: "EVT001",
    buyerId: "USER789",
    eventName: "Summer Music Festival 2024",
    buyerName: "Mike Johnson",
    purchaseDate: "2024-01-20",
  },
  {
    code: "TICKET999",
    used: false,
    eventId: "EVT001",
    buyerId: "USER999",
    eventName: "Summer Music Festival 2024",
    buyerName: "Sarah Wilson",
    purchaseDate: "2024-01-18",
  },
]

export async function POST(request: NextRequest) {
  try {
    const { ticketCode } = await request.json()

    if (!ticketCode) {
      return NextResponse.json({ message: "Ticket code is required", used: null }, { status: 400 })
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Find ticket in mock database
    const ticket = mockTickets.find((t) => t.code === ticketCode)

    if (!ticket) {
      return NextResponse.json({
        message: "Invalid ticket code - not found in system",
        used: null,
      })
    }

    if (ticket.used) {
      return NextResponse.json({
        message: "Ticket has already been used for entry",
        used: true,
        eventId: ticket.eventId,
        buyerId: ticket.buyerId,
        eventName: ticket.eventName,
        buyerName: ticket.buyerName,
        purchaseDate: ticket.purchaseDate,
      })
    }

    // Mark ticket as used (in real app, update database)
    ticket.used = true

    return NextResponse.json({
      message: "Ticket verified successfully - entry granted",
      used: false, // Was false before marking as used
      eventId: ticket.eventId,
      buyerId: ticket.buyerId,
      eventName: ticket.eventName,
      buyerName: ticket.buyerName,
      purchaseDate: ticket.purchaseDate,
    })
  } catch (error) {
    console.error("Error verifying ticket:", error)
    return NextResponse.json({ message: "Server error - please try again", used: null }, { status: 500 })
  }
}
