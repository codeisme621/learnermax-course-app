import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export function Footer() {
  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ];

  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-primary mb-4">LearnerMax</div>
          <div className="flex items-center justify-center gap-6">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <Link
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })}
          </div>
        </div>

        <Separator className="mb-8" />

        <div className="text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} LearnerMax. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
