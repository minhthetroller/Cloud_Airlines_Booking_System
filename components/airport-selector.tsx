"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MapPin, Check, Loader2 } from "lucide-react"
import supabaseClient from "@/lib/supabase/supabaseClient"

interface Airport {
  airportcode: string
  airportname: string
  city: string
  country: string
}

interface AirportSelectorProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  excludeAirport?: string
  label: string
}

export default function AirportSelector({
  id,
  value,
  onChange,
  placeholder = "Select airport",
  excludeAirport,
  label,
}: AirportSelectorProps) {
  const [open, setOpen] = useState(false)
  const [airports, setAirports] = useState<Airport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAirports = async () => {
      setLoading(true)
      setError(null)

      try {
        let query = supabaseClient.from("airports").select("airportcode, airportname, city, country")

        // If we need to exclude an airport (e.g., the already selected origin/destination)
        if (excludeAirport) {
          query = query.neq("airportcode", excludeAirport)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(error.message)
        }

        setAirports(data || [])
      } catch (err) {
        console.error("Error fetching airports:", err)
        setError("Failed to load airports. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchAirports()
  }, [excludeAirport])

  const selectedAirport = airports.find((airport) => airport.airportcode === value)

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-black">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between border-gray-300 bg-white text-black hover:bg-gray-50"
            id={id}
          >
            {selectedAirport ? (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>
                  {selectedAirport.city} ({selectedAirport.airportcode})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{placeholder}</span>
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search airport or city..." />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="py-6 text-center text-red-500">{error}</div>
              ) : (
                <>
                  <CommandEmpty>No airports found.</CommandEmpty>
                  <CommandGroup>
                    {airports.map((airport) => (
                      <CommandItem
                        key={airport.airportcode}
                        value={airport.airportcode}
                        onSelect={(currentValue) => {
                          onChange(currentValue)
                          setOpen(false)
                        }}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            {airport.airportcode === value && <Check className="mr-2 h-4 w-4" />}
                            <span className="font-medium">
                              {airport.city} ({airport.airportcode})
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{airport.airportname}</span>
                          <span className="text-xs text-muted-foreground">{airport.country}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
