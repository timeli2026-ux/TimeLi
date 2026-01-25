'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trash2, X, Clock } from 'lucide-react'
import { CourseInput, DAYS_OF_WEEK, DEFAULT_COURSE_COLOR } from '../types'

interface ClassesStepProps {
  courses: CourseInput[]
  onAddCourse: (course: Omit<CourseInput, 'id'>) => void
  onRemoveCourse: (id: string) => void
  semester: string
}

interface MeetingTime {
  day: number
  start: string
  end: string
}

const COURSE_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#EF4444', label: 'Red' },
  { value: '#22C55E', label: 'Green' },
  { value: '#F59E0B', label: 'Orange' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#84CC16', label: 'Lime' },
]

export function ClassesStep({
  courses,
  onAddCourse,
  onRemoveCourse,
  semester,
}: ClassesStepProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form state for new course
  const [courseName, setCourseName] = useState('')
  const [courseInstructor, setCourseInstructor] = useState('')
  const [courseColor, setCourseColor] = useState(DEFAULT_COURSE_COLOR)
  const [meetings, setMeetings] = useState<MeetingTime[]>([
    { day: 1, start: '09:00', end: '10:00' },
  ])

  const resetForm = () => {
    setCourseName('')
    setCourseInstructor('')
    setCourseColor(DEFAULT_COURSE_COLOR)
    setMeetings([{ day: 1, start: '09:00', end: '10:00' }])
    setFormError(null)
  }

  const handleAddMeeting = () => {
    setMeetings((prev) => [...prev, { day: 1, start: '09:00', end: '10:00' }])
  }

  const handleRemoveMeeting = (index: number) => {
    if (meetings.length > 1) {
      setMeetings((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const handleMeetingChange = (
    index: number,
    field: keyof MeetingTime,
    value: string | number
  ) => {
    setMeetings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    )
  }

  const validateMeetings = (): boolean => {
    for (const meeting of meetings) {
      if (meeting.start >= meeting.end) {
        setFormError('Meeting end time must be after start time')
        return false
      }
    }
    return true
  }

  const handleSaveCourse = () => {
    // Validation
    if (!courseName.trim()) {
      setFormError('Course name is required')
      return
    }

    if (meetings.length === 0) {
      setFormError('At least one meeting time is required')
      return
    }

    if (!validateMeetings()) {
      return
    }

    onAddCourse({
      name: courseName.trim(),
      semester,
      instructor: courseInstructor.trim() || undefined,
      color: courseColor,
      schedule: meetings,
    })

    resetForm()
    setIsDialogOpen(false)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  // Format schedule for display
  const formatSchedule = (schedule: MeetingTime[]): string => {
    const grouped = schedule.reduce((acc, m) => {
      const key = `${m.start}-${m.end}`
      if (!acc[key]) {
        acc[key] = []
      }
      const dayShort = DAYS_OF_WEEK.find((d) => d.value === m.day)?.short || ''
      acc[key].push(dayShort)
      return acc
    }, {} as Record<string, string[]>)

    return Object.entries(grouped)
      .map(([time, days]) => `${days.join('/')} ${time.replace('-', ' - ')}`)
      .join(', ')
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold">Add Your Classes</h2>
        <p className="text-muted-foreground">
          Enter your course schedule for {semester}. We&apos;ll block these times on your calendar.
        </p>
      </div>

      {/* Course List */}
      {courses.length > 0 ? (
        <div className="space-y-3">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: course.color }}
                    />
                    <div className="space-y-1">
                      <h4 className="font-medium">{course.name}</h4>
                      {course.instructor && (
                        <p className="text-sm text-muted-foreground">
                          {course.instructor}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatSchedule(course.schedule)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveCourse(course.id)}
                    className="h-8 w-8 shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Remove {course.name}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No classes added yet</p>
        </div>
      )}

      {/* Add Course Button / Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
            <DialogDescription>
              Enter your course details and meeting times.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Course Name */}
            <div className="space-y-2">
              <Label htmlFor="course-name">Course Name *</Label>
              <Input
                id="course-name"
                placeholder="e.g., Introduction to Psychology"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
              />
            </div>

            {/* Instructor */}
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor (optional)</Label>
              <Input
                id="instructor"
                placeholder="e.g., Dr. Smith"
                value={courseInstructor}
                onChange={(e) => setCourseInstructor(e.target.value)}
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COURSE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setCourseColor(color.value)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      courseColor === color.value
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Meeting Times */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Meeting Times *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddMeeting}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Time
                </Button>
              </div>

              <div className="space-y-3">
                {meetings.map((meeting, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                  >
                    <Select
                      value={meeting.day.toString()}
                      onValueChange={(val) =>
                        handleMeetingChange(index, 'day', parseInt(val))
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.short}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="time"
                      value={meeting.start}
                      onChange={(e) =>
                        handleMeetingChange(index, 'start', e.target.value)
                      }
                      className="w-[110px]"
                    />

                    <span className="text-muted-foreground">to</span>

                    <Input
                      type="time"
                      value={meeting.end}
                      onChange={(e) =>
                        handleMeetingChange(index, 'end', e.target.value)
                      }
                      className="w-[110px]"
                    />

                    {meetings.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMeeting(index)}
                        className="h-8 w-8 shrink-0"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove meeting time</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCourse}>Add Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {courses.length > 0 && (
        <p className="text-sm text-center text-muted-foreground">
          {courses.length} class{courses.length === 1 ? '' : 'es'} added
        </p>
      )}
    </div>
  )
}
