'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus } from 'lucide-react'
import { LifeRealm, SUGGESTED_REALMS } from '../types'

interface RealmsStepProps {
  realms: LifeRealm[]
  onAdd: (realm: Omit<LifeRealm, 'id'>) => void
  onRemove: (id: string) => void
}

export function RealmsStep({ realms, onAdd, onRemove }: RealmsStepProps) {
  const [customName, setCustomName] = useState('')

  // Check if a suggested realm is already selected
  const isRealmSelected = (name: string) =>
    realms.some((r) => r.name === name)

  // Toggle a suggested realm
  const toggleSuggestedRealm = (suggested: Omit<LifeRealm, 'id'>) => {
    const existing = realms.find((r) => r.name === suggested.name)
    if (existing) {
      onRemove(existing.id)
    } else {
      onAdd(suggested)
    }
  }

  // Add a custom realm
  const handleAddCustom = () => {
    const trimmedName = customName.trim()
    if (!trimmedName) return
    if (realms.some((r) => r.name.toLowerCase() === trimmedName.toLowerCase())) {
      return // Already exists
    }
    onAdd({
      name: trimmedName,
      isCustom: true,
    })
    setCustomName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCustom()
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">What areas of life matter most to you?</h2>
        <p className="text-muted-foreground">
          Every moment of your time should contribute to an area of your life that matters.
          Select all the realms you want to invest your time in.
        </p>
        <p className="text-sm text-muted-foreground/80">
          Think comprehensively &mdash; your actions and habits will be organized under these realms.
        </p>
      </div>

      {/* Suggested Realms Grid */}
      <div className="space-y-3">
        <Label>Select from suggestions</Label>
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTED_REALMS.map((suggested) => {
            const isSelected = isRealmSelected(suggested.name)
            return (
              <button
                key={suggested.name}
                type="button"
                onClick={() => toggleSuggestedRealm(suggested)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <span className="text-xl">{suggested.icon}</span>
                <span className="text-sm font-medium">{suggested.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Add Custom Realm */}
      <div className="space-y-2">
        <Label htmlFor="custom-realm">Add your own</Label>
        <div className="flex gap-2">
          <Input
            id="custom-realm"
            type="text"
            placeholder="e.g., Spirituality, Side Projects"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={50}
          />
          <Button
            onClick={handleAddCustom}
            disabled={!customName.trim()}
            size="icon"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selected Realms List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <Label>Selected realms</Label>
          <span className="text-muted-foreground">
            {realms.length} selected {realms.length < 1 && '(min 1)'}
          </span>
        </div>
        {realms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
            Select at least one realm to continue
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {realms.map((realm) => (
              <div
                key={realm.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
              >
                {realm.icon && <span>{realm.icon}</span>}
                <span>{realm.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(realm.id)}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                  aria-label={`Remove ${realm.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
