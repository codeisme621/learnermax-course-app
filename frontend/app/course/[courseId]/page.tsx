import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCourse } from '@/app/actions/courses';
import { checkEnrollment } from '@/app/actions/enrollments';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  ArrowLeft,
  PlayCircle,
  BookOpen,
  CheckCircle,
  Lock,
  Clock,
  Award
} from 'lucide-react';
import type { Metadata } from 'next';

interface CoursePageProps {
  params: Promise<{
    courseId: string;
  }>;
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { courseId } = await params;
  const courseResult = await getCourse(courseId);

  if ('course' in courseResult) {
    return {
      title: `${courseResult.course.name} - LearnerMax`,
      description: courseResult.course.description,
    };
  }

  return {
    title: 'Course - LearnerMax',
    description: 'Access your course content',
  };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;

  // Check authentication
  const session = await auth();
  if (!session) {
    redirect(`/signin?callbackUrl=/course/${courseId}`);
  }

  // Check enrollment
  const isEnrolled = await checkEnrollment(courseId);
  if (!isEnrolled) {
    redirect('/dashboard?error=not-enrolled');
  }

  // Fetch course data
  const courseResult = await getCourse(courseId);
  if ('error' in courseResult) {
    redirect('/dashboard?error=course-not-found');
  }

  const course = courseResult.course;

  // Mock curriculum data (in real implementation, fetch from backend)
  const mockModules = [
    { id: 1, title: 'Introduction to the Course', lessons: 5, completed: 0, duration: '45 min' },
    { id: 2, title: 'Getting Started', lessons: 8, completed: 0, duration: '1.5 hours' },
    { id: 3, title: 'Core Concepts', lessons: 12, completed: 0, duration: '2 hours' },
    { id: 4, title: 'Advanced Topics', lessons: 10, completed: 0, duration: '1.8 hours' },
    { id: 5, title: 'Final Project', lessons: 6, completed: 0, duration: '3 hours' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div className="hidden md:block">
                <h1 className="text-lg font-bold line-clamp-1">{course.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Self-paced
              </Badge>
              <Progress value={0} className="w-24 hidden sm:block" />
              <span className="text-sm text-muted-foreground hidden sm:inline">0%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player Placeholder */}
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <PlayCircle className="w-20 h-20 text-primary/40" />
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">Video Player Coming Soon</h3>
                    <p className="text-sm text-muted-foreground">
                      Course content will be available here
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Course Info */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">{course.name}</h2>
              <p className="text-muted-foreground mb-6">{course.description}</p>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-primary" />
                  <span>All Levels</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Self-paced</span>
                </div>
                {course.instructor && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Instructor:</span>
                    <span className="font-medium">{course.instructor}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Learning Outcomes Placeholder */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                What You&apos;ll Learn
              </h3>
              {course.learningObjectives && course.learningObjectives.length > 0 ? (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {course.learningObjectives.map((objective, index) => (
                    <li key={index}>• {objective}</li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Course learning outcomes will be displayed here</li>
                  <li>• Key skills and concepts covered</li>
                  <li>• Practical applications and projects</li>
                  <li>• Certification upon completion</li>
                </ul>
              )}
            </Card>
          </div>

          {/* Sidebar - Curriculum */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Course Curriculum
              </h3>

              <div className="space-y-3">
                {mockModules.map((module) => (
                  <div
                    key={module.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm line-clamp-2 flex-1">
                        {module.title}
                      </h4>
                      <Lock className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{module.lessons} lessons</span>
                      <span>•</span>
                      <span>{module.duration}</span>
                    </div>
                    <Progress
                      value={(module.completed / module.lessons) * 100}
                      className="h-1 mt-2"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Course Progress</p>
                  <div className="flex items-center justify-between">
                    <span>0 of {mockModules.reduce((sum, m) => sum + m.lessons, 0)} lessons completed</span>
                    <span className="font-semibold">0%</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
