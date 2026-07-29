import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function LegalLayout({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2">Effective {effectiveDate}</p>

        <div
          className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/90
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-3
            [&_p]:mb-3 [&_p]:text-muted-foreground
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-muted-foreground [&_ul]:mb-3
            [&_strong]:text-foreground [&_strong]:font-medium
            [&_a]:text-primary [&_a]:hover:underline"
        >
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
