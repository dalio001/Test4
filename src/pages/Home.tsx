/**
 * Home (`/`) — KeyHaven landing page (design/home.md).
 * Lenis smooth scroll + decorative cursor ring (marketing-only); sections:
 * hero, platform marquee, features bento, pinned encryption story, numbers,
 * testimonials, 3-step start, FAQ, final CTA. Navbar/Footer come from Layout.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router';
import Lenis from 'lenis';
import CursorRing from '@/components/CursorRing';
import HeroSection from '@/components/home/HeroSection';
import PlatformMarquee from '@/components/home/PlatformMarquee';
import BentoFeatures from '@/components/home/BentoFeatures';
import EncryptionStory from '@/components/home/EncryptionStory';
import NumbersStrip from '@/components/home/NumbersStrip';
import Testimonials from '@/components/home/Testimonials';
import StepsSection from '@/components/home/StepsSection';
import FaqSection from '@/components/home/FaqSection';
import FinalCta from '@/components/home/FinalCta';

export default function Home() {
  const location = useLocation();

  // Lenis smooth scroll (marketing pages only), lerp 0.09 per design.md §5
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.09 });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  // honor /#section deep links
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
    return () => clearTimeout(t);
  }, [location.hash]);

  return (
    <>
      <CursorRing />
      <HeroSection />
      <PlatformMarquee />
      <BentoFeatures />
      <EncryptionStory />
      <NumbersStrip />
      <Testimonials />
      <StepsSection />
      <FaqSection />
      <FinalCta />
    </>
  );
}