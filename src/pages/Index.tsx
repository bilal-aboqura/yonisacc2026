import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Modules } from "@/components/landing/Modules";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { NizamFooter } from "@/components/landing/NizamFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <Modules />
      <Pricing />
      <FAQ />
      <NizamFooter />
    </div>
  );
};

export default Index;
