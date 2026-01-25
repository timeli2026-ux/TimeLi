'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Trash2, Upload, Edit2, Calendar, Clock, FileText, Loader2 } from 'lucide-react'
import { CourseInput, AssignmentInput, ASSIGNMENT_TYPES } from '../types'

interface AssignmentsStepProps {
  courses: CourseInput[]
  assignments: AssignmentInput[]
  onAddAssignment: (assignment: Omit<AssignmentInput, 'id'>) => void
  onAddAssignments: (assignments: Omit<AssignmentInput, 'id'>[]) => void
  onRemoveAssignment: (id: string) => void
}

interface ParsedAssignment {
  title: string
  type: 'homework' | 'exam' | 'project' | 'reading' | 'quiz' | 'paper' | 'other'
  dueDate: string | null
  estimatedHours: number
  notes?: string
}

type Mode = 'import' | 'manual'

export function AssignmentsStep({
  courses,
  assignments,
  onAddAssignment,
  onAddAssignments,
  onRemoveAssignment,
}: AssignmentsStepProps) {
  // Mode toggle
  const [mode, setMode] = useState<Mode>('import')

  // Syllabus import state
  const [syllabusText, setSyllabusText] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [isParsing, setIsParsing] = useState(false)
  const [parsedAssignments, setParsedAssignments] = useState<ParsedAssignment[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Manual entry state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualType, setManualType] = useState<AssignmentInput['type']>('homework')
  const [manualDueDate, setManualDueDate] = useState('')
  const [manualEstimatedHours, setManualEstimatedHours] = useState('2')
  const [manualCourseId, setManualCourseId] = useState<string>('')
  const [manualNotes, setManualNotes] = useState('')
  const [manualFormError, setManualFormError] = useState<string | null>(null)

  // Edit parsed assignment state
  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState<AssignmentInput['type']>('homework')
  const [editDueDate, setEditDueDate] = useState('')
  const [editEstimatedHours, setEditEstimatedHours] = useState('2')

  const selectedCourse = courses.find((c) => c.id === selectedCourseId)

  // Parse syllabus with API
  const handleParseSyllabus = async () => {
    if (syllabusText.length < 50) {
      toast.error('Please enter at least 50 characters of syllabus text')
      return
    }

    setIsParsing(true)
    setParsedAssignments([])

    try {
      const response = await fetch('/api/syllabus/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syllabusText,
          courseName: selectedCourse?.name,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to parse syllabus')
      }

      const data = await response.json()

      // Map parsed assignments
      const mapped: ParsedAssignment[] = data.assignments.map(
        (a: { title: string; type: string; dueDate: string | null; estimatedHours: number; notes?: string }) => ({
          title: a.title,
          type: a.type as ParsedAssignment['type'],
          dueDate: a.dueDate,
          estimatedHours: a.estimatedHours,
          notes: a.notes,
        })
      )

      setParsedAssignments(mapped)
      toast.success(`Found ${mapped.length} assignment${mapped.length === 1 ? '' : 's'}`)
    } catch (err) {
      console.error('Error parsing syllabus:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to parse syllabus')
    } finally {
      setIsParsing(false)
    }
  }

  // Remove a parsed assignment
  const handleRemoveParsed = (index: number) => {
    setParsedAssignments((prev) => prev.filter((_, i) => i !== index))
  }

  // Start editing a parsed assignment
  const handleStartEdit = (index: number) => {
    const assignment = parsedAssignments[index]
    setEditTitle(assignment.title)
    setEditType(assignment.type)
    setEditDueDate(assignment.dueDate || '')
    setEditEstimatedHours(assignment.estimatedHours.toString())
    setEditingIndex(index)
  }

  // Save edited parsed assignment
  const handleSaveEdit = () => {
    if (editingIndex === null) return

    setParsedAssignments((prev) =>
      prev.map((a, i) =>
        i === editingIndex
          ? {
              ...a,
              title: editTitle,
              type: editType,
              dueDate: editDueDate || null,
              estimatedHours: parseFloat(editEstimatedHours) || 2,
            }
          : a
      )
    )
    setEditingIndex(null)
  }

  // Add all parsed assignments to form data
  const handleAddAllParsed = () => {
    if (parsedAssignments.length === 0) return

    const toAdd: Omit<AssignmentInput, 'id'>[] = parsedAssignments.map((a) => ({
      title: a.title,
      type: a.type,
      dueDate: a.dueDate || new Date().toISOString().split('T')[0], // Default to today if no date
      estimatedHours: a.estimatedHours,
      courseId: selectedCourseId || undefined,
      notes: a.notes,
    }))

    onAddAssignments(toAdd)
    setParsedAssignments([])
    setSyllabusText('')
    toast.success(`Added ${toAdd.length} assignment${toAdd.length === 1 ? '' : 's'}`)
  }

  // Reset manual form
  const resetManualForm = () => {
    setManualTitle('')
    setManualType('homework')
    setManualDueDate('')
    setManualEstimatedHours('2')
    setManualCourseId('')
    setManualNotes('')
    setManualFormError(null)
  }

  // Handle manual assignment submission
  const handleAddManualAssignment = () => {
    if (!manualTitle.trim()) {
      setManualFormError('Title is required')
      return
    }

    if (!manualDueDate) {
      setManualFormError('Due date is required')
      return
    }

    const hours = parseFloat(manualEstimatedHours)
    if (isNaN(hours) || hours < 0.5) {
      setManualFormError('Estimated hours must be at least 0.5')
      return
    }

    onAddAssignment({
      title: manualTitle.trim(),
      type: manualType,
      dueDate: manualDueDate,
      estimatedHours: hours,
      courseId: manualCourseId || undefined,
      notes: manualNotes.trim() || undefined,
    })

    resetManualForm()
    setIsAddDialogOpen(false)
    toast.success('Assignment added')
  }

  // Group assignments by course
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const key = assignment.courseId || 'standalone'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(assignment)
    return acc
  }, {} as Record<string, AssignmentInput[]>)

  // Get course name by ID
  const getCourseName = (courseId: string | undefined): string => {
    if (!courseId) return 'Standalone'
    const course = courses.find((c) => c.id === courseId)
    return course?.name || 'Unknown Course'
  }

  // Format date for display
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Get badge variant for assignment type
  const getTypeBadgeVariant = (type: AssignmentInput['type']) => {
    switch (type) {
      case 'exam':
        return 'destructive' as const
      case 'project':
        return 'default' as const
      case 'paper':
        return 'secondary' as const
      default:
        return 'outline' as const
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold">Add Your Assignments</h2>
        <p className="text-muted-foreground">
          Import from your syllabus or add assignments manually.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center gap-2">
        <Button
          variant={mode === 'import' ? 'default' : 'outline'}
          onClick={() => setMode('import')}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Import from Syllabus
        </Button>
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'}
          onClick={() => setMode('manual')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Manually
        </Button>
      </div>

      {/* Syllabus Import Mode */}
      {mode === 'import' && (
        <div className="space-y-4">
          {/* Course Selector */}
          {courses.length > 0 && (
            <div className="space-y-2">
              <Label>Course (optional)</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a course for these assignments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No course</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: course.color }}
                        />
                        {course.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Syllabus Textarea */}
          <div className="space-y-2">
            <Label htmlFor="syllabus-text">Paste Syllabus Text</Label>
            <Textarea
              id="syllabus-text"
              placeholder="Paste your syllabus text here. Include assignment names, due dates, and any other relevant information..."
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              className="min-h-[150px]"
            />
            <p className="text-xs text-muted-foreground">
              {syllabusText.length} / 50 characters minimum
            </p>
          </div>

          {/* Parse Button */}
          <Button
            onClick={handleParseSyllabus}
            disabled={isParsing || syllabusText.length < 50}
            className="w-full"
          >
            {isParsing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Parse Syllabus
              </>
            )}
          </Button>

          {/* Parsed Assignments */}
          {parsedAssignments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Found {parsedAssignments.length} Assignment{parsedAssignments.length === 1 ? '' : 's'}
                </h3>
                <Button onClick={handleAddAllParsed} size="sm">
                  Add All
                </Button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {parsedAssignments.map((assignment, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-3">
                      {editingIndex === index ? (
                        // Editing mode
                        <div className="space-y-3">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Title"
                          />
                          <div className="flex gap-2">
                            <Select value={editType} onValueChange={(v) => setEditType(v as AssignmentInput['type'])}>
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ASSIGNMENT_TYPES.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="date"
                              value={editDueDate}
                              onChange={(e) => setEditDueDate(e.target.value)}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={editEstimatedHours}
                              onChange={(e) => setEditEstimatedHours(e.target.value)}
                              min="0.5"
                              step="0.5"
                              className="w-[80px]"
                              placeholder="Hrs"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingIndex(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{assignment.title}</span>
                              <Badge variant={getTypeBadgeVariant(assignment.type)}>
                                {assignment.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {assignment.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(assignment.dueDate)}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {assignment.estimatedHours}h
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit(index)}
                              className="h-7 w-7"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveParsed(index)}
                              className="h-7 w-7"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Entry Mode */}
      {mode === 'manual' && (
        <div className="text-center py-4">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Assignment
          </Button>
        </div>
      )}

      {/* Manual Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
            <DialogDescription>
              Enter the assignment details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="manual-title">Title *</Label>
              <Input
                id="manual-title"
                placeholder="e.g., Chapter 5 Reading"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={manualType} onValueChange={(v) => setManualType(v as AssignmentInput['type'])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="manual-due-date">Due Date *</Label>
              <Input
                id="manual-due-date"
                type="date"
                value={manualDueDate}
                onChange={(e) => setManualDueDate(e.target.value)}
              />
            </div>

            {/* Estimated Hours */}
            <div className="space-y-2">
              <Label htmlFor="manual-hours">Estimated Hours *</Label>
              <Input
                id="manual-hours"
                type="number"
                min="0.5"
                step="0.5"
                value={manualEstimatedHours}
                onChange={(e) => setManualEstimatedHours(e.target.value)}
              />
            </div>

            {/* Course */}
            {courses.length > 0 && (
              <div className="space-y-2">
                <Label>Course (optional)</Label>
                <Select value={manualCourseId} onValueChange={setManualCourseId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No course</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: course.color }}
                          />
                          {course.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="manual-notes">Notes (optional)</Label>
              <Textarea
                id="manual-notes"
                placeholder="Any additional details..."
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Error Message */}
            {manualFormError && (
              <p className="text-sm text-destructive">{manualFormError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetManualForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddManualAssignment}>Add Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment List */}
      {assignments.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">
            {assignments.length} Assignment{assignments.length === 1 ? '' : 's'} Added
          </h3>

          {Object.entries(groupedAssignments).map(([courseId, courseAssignments]) => (
            <div key={courseId} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {courseId !== 'standalone' && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: courses.find((c) => c.id === courseId)?.color || '#888' }}
                  />
                )}
                {getCourseName(courseId === 'standalone' ? undefined : courseId)}
              </h4>

              <div className="space-y-2">
                {courseAssignments.map((assignment) => (
                  <Card key={assignment.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{assignment.title}</span>
                            <Badge variant={getTypeBadgeVariant(assignment.type)}>
                              {assignment.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(assignment.dueDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {assignment.estimatedHours}h
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveAssignment(assignment.id)}
                          className="h-7 w-7 shrink-0"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                          <span className="sr-only">Remove {assignment.title}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
