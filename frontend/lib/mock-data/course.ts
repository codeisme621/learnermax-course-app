// Course data structure
export interface CourseData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  level: string;
  category: string;
  instructor: {
    name: string;
    title: string;
    background: string;
    imageUrl: string;
  };
  outcomes: string[];
  curriculum: {
    module: string;
    topics: string[];
  }[];
  testimonials: {
    id: string;
    name: string;
    role: string;
    content: string;
    imageUrl: string;
    rating: number;
  }[];
  stats: {
    students: string;
    rating: string;
    certificates: string;
  };
}

export const mockCourse: CourseData = {
  id: "course-001",
  title: "Master Modern Web Development",
  subtitle: "Build production-ready applications with the latest technologies",
  description: "Learn to create scalable, performant web applications using React, Next.js, TypeScript, and modern cloud technologies. This comprehensive course takes you from fundamentals to advanced concepts.",
  duration: "12 weeks",
  level: "Intermediate to Advanced",
  category: "Web Development",
  instructor: {
    name: "Sarah Johnson",
    title: "Senior Software Engineer at Tech Corp",
    background: "10+ years of experience building scalable web applications. Former lead developer at major tech companies, passionate about teaching and mentoring.",
    imageUrl: "/images/instructor.jpg",
  },
  outcomes: [
    "Build full-stack applications with React and Next.js",
    "Master TypeScript for type-safe development",
    "Deploy applications to production using modern cloud platforms",
    "Implement authentication and authorization flows",
    "Optimize performance and accessibility",
    "Write comprehensive tests for your applications",
    "Follow best practices for code organization and architecture",
    "Work with databases and APIs effectively",
  ],
  curriculum: [
    {
      module: "Module 1: Foundations",
      topics: [
        "Modern JavaScript and ES6+",
        "TypeScript fundamentals",
        "React core concepts",
        "Component composition",
      ],
    },
    {
      module: "Module 2: Next.js and Routing",
      topics: [
        "App Router fundamentals",
        "Server and Client Components",
        "Data fetching strategies",
        "Route handlers and API routes",
      ],
    },
    {
      module: "Module 3: State Management",
      topics: [
        "React Context API",
        "Server state with React Query",
        "Form handling and validation",
        "Advanced state patterns",
      ],
    },
    {
      module: "Module 4: Styling and UI",
      topics: [
        "Tailwind CSS mastery",
        "Component libraries",
        "Responsive design",
        "Animations with Framer Motion",
      ],
    },
    {
      module: "Module 5: Backend Integration",
      topics: [
        "RESTful API design",
        "Database integration",
        "Authentication and security",
        "Error handling",
      ],
    },
    {
      module: "Module 6: Testing and Deployment",
      topics: [
        "Unit testing with Jest",
        "E2E testing with Playwright",
        "CI/CD pipelines",
        "Production deployment",
      ],
    },
  ],
  testimonials: [
    {
      id: "testimonial-1",
      name: "Michael Chen",
      role: "Software Developer at StartupXYZ",
      content: "This course transformed my career! The practical approach and real-world projects helped me land my dream job. Sarah's teaching style is exceptional.",
      imageUrl: "/images/testimonial-1.jpg",
      rating: 5,
    },
    {
      id: "testimonial-2",
      name: "Emily Rodriguez",
      role: "Freelance Web Developer",
      content: "Best investment I've made in my education. The course content is up-to-date and the community support is amazing. Highly recommended!",
      imageUrl: "/images/testimonial-2.jpg",
      rating: 5,
    },
    {
      id: "testimonial-3",
      name: "David Kim",
      role: "Junior Developer at TechCo",
      content: "From zero to hero! I went from barely knowing React to building production applications. The projects were challenging but incredibly rewarding.",
      imageUrl: "/images/testimonial-3.jpg",
      rating: 5,
    },
    {
      id: "testimonial-4",
      name: "Lisa Wang",
      role: "Product Manager transitioning to Dev",
      content: "Perfect for career changers. The course structure made complex topics accessible. Now I can contribute to technical discussions with confidence.",
      imageUrl: "/images/testimonial-4.jpg",
      rating: 5,
    },
  ],
  stats: {
    students: "15,000+",
    rating: "4.9/5",
    certificates: "12,000+",
  },
};
