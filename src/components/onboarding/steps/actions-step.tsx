'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { LifeRealm, InitialGoal } from '../types'

interface ActionsStepProps {
  realms: LifeRealm[]
  actions: InitialGoal[]
  onAdd: (action: Omit<InitialGoal, 'id'>) => void
  onRemove: (id: string) => void
}

const MAX_ACTIONS_PER_REALM = 5
const MAX_TOTAL_ACTIONS = 20

// Frequency options
const FREQUENCY_OPTIONS = [
  { value: 1, label: '1x per week' },
  { value: 2, label: '2x per week' },
  { value: 3, label: '3x per week' },
  { value: 4, label: '4x per week' },
  { value: 5, label: '5x per week' },
  { value: 6, label: '6x per week' },
  { value: 7, label: 'Daily' },
]

// Duration presets in minutes
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]

export function ActionsStep({ realms, actions, onAdd, onRemove }: ActionsStepProps) {
  const [expandedRealm, setExpandedRealm] = useState<string | null>(
    realms.length > 0 ? realms[0].id : null
  )
  const [title, setTitle] = useState('')
  const [timesPerWeek, setTimesPerWeek] = useState(3)
  const [minutesPerSession, setMinutesPerSession] = useState(60)
  const [activeRealmId, setActiveRealmId] = useState<string | null>(
    realms.length > 0 ? realms[0].id : null
  )

  // Get actions for a specific realm
  const getActionsForRealm = (realmId: string) =>
    actions.filter((a) => a.realmId === realmId)

  // Calculate hours per week
  const calculateHoursPerWeek = (times: number, minutes: number) =>
    (times * minutes) / 60

  const handleAdd = () => {
    if (!title.trim() || !activeRealmId) return
    if (actions.length >= MAX_TOTAL_ACTIONS) return

    const realmActions = getActionsForRealm(activeRealmId)
    if (realmActions.length >= MAX_ACTIONS_PER_REALM) return

    onAdd({
      title: title.trim(),
      realmId: activeRealmId,
      timesPerWeek,
      minutesPerSession,
      hoursPerWeek: calculateHoursPerWeek(timesPerWeek, minutesPerSession),
    })

    // Reset form
    setTitle('')
    setTimesPerWeek(3)
    setMinutesPerSession(60)
  }

  const toggleRealm = (realmId: string) => {
    if (expandedRealm === realmId) {
      setExpandedRealm(null)
    } else {
      setExpandedRealm(realmId)
      setActiveRealmId(realmId)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} hr`
    return `${hours} hr ${mins} min`
  }

  const formatFrequency = (times: number) => {
    if (times === 7) return 'Daily'
    return `${times}x/week`
  }

  const totalHours = actions.reduce((sum, a) => sum + a.hoursPerWeek, 0)
  const isAtTotalLimit = actions.length >= MAX_TOTAL_ACTIONS

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Actions & Habits</h2>
        <p className="text-muted-foreground">
          What specific actions will you commit to for each area of your life?
        </p>
        <div className="text-sm text-muted-foreground">
          {actions.length} actions, {totalHours.toFixed(1)} hours/week total
        </div>
      </div>

      {/* Realms with Actions */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {realms.map((realm) => {
          const realmActions = getActionsForRealm(realm.id)
          const realmHours = realmActions.reduce((sum, a) => sum + a.hoursPerWeek, 0)
          const isExpanded = expandedRealm === realm.id
          const isAtRealmLimit = realmActions.length >= MAX_ACTIONS_PER_REALM

          return (
            <div
              key={realm.id}
              className="border rounded-lg overflow-hidden"
            >
              {/* Realm Header */}
              <button
                type="button"
                onClick={() => toggleRealm(realm.id)}
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {realm.icon && <span className="text-lg">{realm.icon}</span>}
                  <span className="font-medium">{realm.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({realmActions.length} actions, {realmHours.toFixed(1)} hrs/wk)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-3 space-y-3 border-t">
                  {/* Actions List */}
                  {realmActions.length > 0 && (
                    <div className="space-y-2">
                      {realmActions.map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between p-2 bg-background rounded border"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{action.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFrequency(action.timesPerWeek)} &middot; {formatDuration(action.minutesPerSession)} each &middot; {action.hoursPerWeek.toFixed(1)} hrs/wk
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemove(action.id)}
                            className="ml-2 shrink-0 h-7 w-7 p-0"
                            aria-label={`Remove ${action.title}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Action Form */}
                  {!isAtTotalLimit && !isAtRealmLimit && (
                    <div className="space-y-3 pt-2 border-t">
                      {/* Action Title */}
                      <div className="space-y-1">
                        <Label htmlFor={`action-${realm.id}`} className="text-xs">
                          New action or habit
                        </Label>
                        <Input
                          id={`action-${realm.id}`}
                          type="text"
                          placeholder="e.g., Go to the gym, Read books, Practice piano"
                          value={activeRealmId === realm.id ? title : ''}
                          onChange={(e) => {
                            setActiveRealmId(realm.id)
                            setTitle(e.target.value)
                          }}
                          onFocus={() => setActiveRealmId(realm.id)}
                          maxLength={100}
                          className="h-9"
                        />
                      </div>

                      {/* Frequency and Duration */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Frequency */}
                        <div className="space-y-1">
                          <Label className="text-xs">Frequency</Label>
                          <Select
                            value={String(activeRealmId === realm.id ? timesPerWeek : 3)}
                            onValueChange={(value) => {
                              setActiveRealmId(realm.id)
                              setTimesPerWeek(parseInt(value))
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FREQUENCY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={String(opt.value)}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Duration per session */}
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Duration: {formatDuration(activeRealmId === realm.id ? minutesPerSession : 60)}
                          </Label>
                          <Slider
                            min={15}
                            max={180}
                            step={15}
                            value={[activeRealmId === realm.id ? minutesPerSession : 60]}
                            onValueChange={([value]) => {
                              setActiveRealmId(realm.id)
                              setMinutesPerSession(value)
                            }}
                            className="py-2"
                          />
                        </div>
                      </div>

                      {/* Preview and Add */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          = {calculateHoursPerWeek(
                            activeRealmId === realm.id ? timesPerWeek : 3,
                            activeRealmId === realm.id ? minutesPerSession : 60
                          ).toFixed(1)} hrs/week
                        </span>
                        <Button
                          onClick={handleAdd}
                          disabled={!title.trim() || activeRealmId !== realm.id}
                          size="sm"
                          className="h-8"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  )}

                  {isAtRealmLimit && (
                    <p className="text-xs text-amber-600 text-center">
                      Max {MAX_ACTIONS_PER_REALM} actions per realm
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isAtTotalLimit && (
        <p className="text-sm text-amber-600 text-center">
          Maximum of {MAX_TOTAL_ACTIONS} actions during onboarding.
        </p>
      )}

      {realms.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Go back and select at least one life realm first.
        </p>
      )}

      <p className="text-xs text-muted-foreground text-center">
        You can always adjust your actions and habits later from the dashboard.
      </p>
    </div>
  )
}
