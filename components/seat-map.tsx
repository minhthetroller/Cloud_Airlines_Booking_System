"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface Seat {
  seatid: number
  airplanetypeid: number
  seatnumber: string
  classid: number
  seattype: string
  isoccupied?: boolean
}

interface SeatMapProps {
  seats: Seat[]
  selectedSeat: Seat | null
  onSelectSeat: (seat: Seat) => void
  userClassId: number
  onUpgradeClass?: (newClassId: number) => void
  onDowngradeClass?: (newClassId: number) => void
}

export default function SeatMap({
  seats,
  selectedSeat,
  onSelectSeat,
  userClassId,
  onUpgradeClass,
  onDowngradeClass,
}: SeatMapProps) {
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false)
  const [seatToChange, setSeatToChange] = useState<Seat | null>(null)

  // Group seats by row
  const seatsByRow: Record<number, Seat[]> = {}
  seats.forEach((seat) => {
    // Extract row number from seat number (e.g., "12A" -> 12)
    const rowNumber = Number.parseInt(seat.seatnumber.match(/\d+/)?.[0] || "0")
    if (!seatsByRow[rowNumber]) {
      seatsByRow[rowNumber] = []
    }
    seatsByRow[rowNumber].push(seat)
  })

  // Sort rows
  const sortedRows = Object.keys(seatsByRow)
    .map(Number)
    .sort((a, b) => a - b)

  // Divide rows into three columns
  const rowsPerColumn = Math.ceil(sortedRows.length / 3)
  const column1Rows = sortedRows.slice(0, rowsPerColumn)
  const column2Rows = sortedRows.slice(rowsPerColumn, rowsPerColumn * 2)
  const column3Rows = sortedRows.slice(rowsPerColumn * 2)

  // Get class name based on class ID
  const getClassName = (classId: number) => {
    switch (classId) {
      case 1:
        return "Economy Saver"
      case 2:
        return "Economy Flex"
      case 3:
        return "Premium Economy"
      case 4:
        return "Business"
      case 5:
        return "First Class"
      default:
        return "Unknown"
    }
  }

  // Get background color based on class ID - more vibrant colors
  const getClassColor = (classId: number) => {
    switch (classId) {
      case 1:
        return "bg-red-300"
      case 2:
        return "bg-orange-300"
      case 3:
        return "bg-yellow-300"
      case 4:
        return "bg-blue-300"
      case 5:
        return "bg-purple-300"
      default:
        return "bg-gray-300"
    }
  }

  // Handle seat click
  const handleSeatClick = (seat: Seat) => {
    if (seat.isoccupied || seat.seattype === "blocked") return // Cannot select occupied or blocked seats

    // Check if user is trying to select a seat in a higher class
    // Higher classId means higher class (e.g., First Class is 5, Economy Saver is 1)
    if (seat.classid > userClassId) {
      setSeatToChange(seat)
      setUpgradeDialogOpen(true)
      return
    }

    // Check if user is trying to select a seat in a lower class
    // Lower classId means lower class
    if (seat.classid < userClassId) {
      setSeatToChange(seat)
      setDowngradeDialogOpen(true)
      return
    }

    // If the seat class matches the user's class, select it directly
    onSelectSeat(seat)
  }

  // Handle upgrade confirmation
  const handleUpgradeConfirm = () => {
    if (seatToChange) {
      // Update the user's class ID if the onUpgradeClass callback is provided
      if (onUpgradeClass) {
        onUpgradeClass(seatToChange.classid)
      }

      // Select the seat
      onSelectSeat(seatToChange)
    }
    setUpgradeDialogOpen(false)
    setSeatToChange(null)
  }

  // Handle downgrade confirmation
  const handleDowngradeConfirm = () => {
    if (seatToChange) {
      // Update the user's class ID if the onDowngradeClass callback is provided
      if (onDowngradeClass) {
        onDowngradeClass(seatToChange.classid)
      }

      // Select the seat
      onSelectSeat(seatToChange)
    }
    setDowngradeDialogOpen(false)
    setSeatToChange(null)
  }

  // Render a single seat
  const renderSeat = (seat: Seat) => {
    const isSelected = selectedSeat?.seatid === seat.seatid
    const isBlocked = seat.seattype === "blocked" || seat.seatnumber.startsWith("3") || seat.seatnumber.startsWith("13")
    const isOccupied = seat.isoccupied

    let buttonClass = `w-12 h-12 flex items-center justify-center rounded font-medium text-sm`
    let cursorClass = "cursor-pointer"

    // Apply status colors first (these override class colors)
    if (isSelected) {
      buttonClass += " bg-blue-500 text-white"
    } else if (isOccupied) {
      buttonClass += " bg-red-500 text-white"
      cursorClass = "cursor-not-allowed"
    } else if (isBlocked) {
      buttonClass += " bg-gray-700 text-white"
      cursorClass = "cursor-not-allowed"
    } else {
      // If not selected/occupied/blocked, use class color
      buttonClass += ` ${getClassColor(seat.classid)} hover:brightness-90`
    }

    buttonClass += ` ${cursorClass}`

    return (
      <button
        key={seat.seatid}
        type="button"
        className={buttonClass}
        onClick={() => handleSeatClick(seat)}
        disabled={isOccupied || isBlocked}
        title={`${seat.seatnumber} - ${getClassName(seat.classid)}${isOccupied ? " - Occupied" : ""}${
          isBlocked ? " - Blocked" : ""
        }`}
      >
        {seat.seatnumber}
      </button>
    )
  }

  // Render a row of seats
  const renderRow = (rowNumber: number) => {
    const rowSeats = seatsByRow[rowNumber].sort((a, b) => {
      // Sort by seat letter (A, B, C, D, E, F)
      const letterA = a.seatnumber.slice(-1)
      const letterB = b.seatnumber.slice(-1)
      return letterA.localeCompare(letterB)
    })

    // Group seats by side (left: A, B, C; right: D, E, F)
    const leftSeats = rowSeats.filter((seat) => ["A", "B", "C"].includes(seat.seatnumber.slice(-1)))
    const rightSeats = rowSeats.filter((seat) => ["D", "E", "F"].includes(seat.seatnumber.slice(-1)))

    return (
      <div key={rowNumber} className="flex items-center mb-2">
        <div className="w-8 text-right mr-2 font-medium">{rowNumber}</div>
        <div className="flex space-x-1">
          {leftSeats.map(renderSeat)}
          <div className="w-6"></div> {/* Aisle space */}
          {rightSeats.map(renderSeat)}
        </div>
      </div>
    )
  }

  // Render a column of rows
  const renderColumn = (rows: number[], title: string) => {
    return (
      <div className="bg-white rounded-lg p-4 mb-4">
        <h3 className="text-lg font-bold mb-4 text-center">{title}</h3>
        <div className="flex justify-center mb-2">
          <div className="w-8"></div>
          <div className="flex space-x-1">
            <div className="w-12 text-center font-medium">A</div>
            <div className="w-12 text-center font-medium">B</div>
            <div className="w-12 text-center font-medium">C</div>
            <div className="w-6"></div> {/* Aisle space */}
            <div className="w-12 text-center font-medium">D</div>
            <div className="w-12 text-center font-medium">E</div>
            <div className="w-12 text-center font-medium">F</div>
          </div>
        </div>
        {rows.map(renderRow)}
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {column1Rows.length > 0 &&
          renderColumn(column1Rows, `Rows ${column1Rows[0]} - ${column1Rows[column1Rows.length - 1]}`)}
        {column2Rows.length > 0 &&
          renderColumn(column2Rows, `Rows ${column2Rows[0]} - ${column2Rows[column2Rows.length - 1]}`)}
        {column3Rows.length > 0 &&
          renderColumn(column3Rows, `Rows ${column3Rows[0]} - ${column3Rows[column3Rows.length - 1]}`)}
      </div>

      {/* Status Legend */}
      <div className="mt-6 bg-white rounded-lg p-4">
        <h3 className="text-lg font-bold mb-2">Seat Status</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded mr-2 bg-gray-700"></div>
            <span>Blocked</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded mr-2 bg-red-500"></div>
            <span>Occupied</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded mr-2 bg-blue-500"></div>
            <span>Selected</span>
          </div>
        </div>
      </div>

      {/* Class Legend */}
      <div className="mt-4 bg-white rounded-lg p-4">
        <h3 className="text-lg font-bold mb-2">Seat Classes</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className={`w-6 h-6 rounded mr-2 ${getClassColor(1)}`}></div>
            <span>Economy Saver</span>
          </div>
          <div className="flex items-center">
            <div className={`w-6 h-6 rounded mr-2 ${getClassColor(2)}`}></div>
            <span>Economy Flex</span>
          </div>
          <div className="flex items-center">
            <div className={`w-6 h-6 rounded mr-2 ${getClassColor(3)}`}></div>
            <span>Premium Economy</span>
          </div>
          <div className="flex items-center">
            <div className={`w-6 h-6 rounded mr-2 ${getClassColor(4)}`}></div>
            <span>Business</span>
          </div>
          <div className="flex items-center">
            <div className={`w-6 h-6 rounded mr-2 ${getClassColor(5)}`}></div>
            <span>First Class</span>
          </div>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              This seat is in a higher class ({seatToChange ? getClassName(seatToChange.classid) : ""}) than your
              current ticket ({getClassName(userClassId)}). Would you like to upgrade your ticket?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpgradeConfirm}>Upgrade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downgrade Dialog */}
      <Dialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Downgrade Confirmation</DialogTitle>
            <DialogDescription>
              This seat is in a lower class ({seatToChange ? getClassName(seatToChange.classid) : ""}) than your current
              ticket ({getClassName(userClassId)}). Are you sure you want to downgrade your ticket?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDowngradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDowngradeConfirm}>Confirm Downgrade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
