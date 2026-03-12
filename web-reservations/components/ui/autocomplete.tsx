"use client"

import { useState, useEffect, useRef } from "react"
import { IconLoader2 } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type AutocompleteProps<T> = {
  searchFn: (query: string) => Promise<T[]>
  displayFn: (item: T) => string
  onSelect: (item: T | null) => void
  value: string
  placeholder?: string
  disabled?: boolean
  minChars?: number
  onAddNew?: () => void
  addNewLabel?: string
  className?: string
}

export function Autocomplete<T>({
  searchFn,
  displayFn,
  onSelect,
  value,
  placeholder,
  disabled,
  minChars = 2,
  onAddNew,
  addNewLabel = "Agregar nuevo",
  className,
}: AutocompleteProps<T>) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Click-outside closes dropdown
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [])

  // Debounced search
  useEffect(() => {
    if (query.length < minChars) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const data = await searchFn(query)
        setResults(data)
        setHighlightedIndex(-1)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, searchFn, minChars])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newQuery = e.target.value
    setQuery(newQuery)
    setIsOpen(true)
    setHighlightedIndex(-1)
    onSelect(null)
  }

  function handleSelect(item: T) {
    onSelect(item)
    setQuery("")
    setIsOpen(false)
    setResults([])
    setHighlightedIndex(-1)
  }

  function handleAddNew() {
    setIsOpen(false)
    onAddNew?.()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        handleSelect(results[highlightedIndex])
      } else if (showNoResults && onAddNew) {
        handleAddNew()
      }
    } else if (e.key === "Tab") {
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        e.preventDefault()
        handleSelect(results[highlightedIndex])
      } else {
        setIsOpen(false)
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
      setHighlightedIndex(-1)
    }
  }

  const showDropdown = isOpen && !disabled && (query.length > 0)
  const showMinCharsHint = showDropdown && query.length < minChars
  const showResults = showDropdown && query.length >= minChars && results.length > 0
  const showNoResults = showDropdown && query.length >= minChars && !isLoading && results.length === 0

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Input
          value={value || query}
          onChange={handleInputChange}
          onFocus={() => { if (query.length > 0) setIsOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(isLoading && "pr-8")}
          autoComplete="off"
        />
        {isLoading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
          </span>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {showMinCharsHint && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Escribí al menos {minChars} caracteres...
            </p>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" />
              Buscando...
            </div>
          )}

          {showResults && (
            <ul className="max-h-60 overflow-auto py-1">
              {results.map((item, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      idx === highlightedIndex && "bg-accent text-accent-foreground"
                    )}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelect(item)
                    }}
                  >
                    {displayFn(item)}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showNoResults && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No se encontraron resultados
            </div>
          )}

          {showNoResults && onAddNew && (
            <div className="border-t px-2 py-1.5">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-sm"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleAddNew()
                }}
              >
                + {addNewLabel}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
