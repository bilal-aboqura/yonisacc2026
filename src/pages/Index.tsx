import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Modules } from "@/components/landing/Modules";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { ContactSection } from "@/components/landing/ContactSection";
import { NizamFooter } from "@/components/landing/NizamFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <Modules />
      <Pricing />
      <Testimonials />
      <FAQ />
      <ContactSection />
      <NizamFooter />
    </div>
  );
};

export default Index;
