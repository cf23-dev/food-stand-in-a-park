import type { Metadata } from "next";
import Link from "next/link";
import { MissionArt } from "@/components/Illustrations";

export const metadata: Metadata = {
  title: "About Us | Food Stand in a Park",
  description: "Our student-led mission to reduce hunger and food waste, inspire youth leadership, and strengthen communities.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">About Us</h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-gray-600">Our nonprofit organization is committed to improving the lives of those in need by setting up food drives to collect and donate unwanted food from families. Discover how you can get involved and make a positive impact today.</p>
      <section className="mt-10 grid items-center gap-10 lg:grid-cols-2" aria-labelledby="mission-heading">
        <div>
          <h2 id="mission-heading" className="text-2xl font-bold">Our Mission</h2>
          <p className="mt-4 leading-relaxed text-gray-600">
            Food Stand in a Park is a student-led nonprofit organization dedicated to reducing hunger and food waste by empowering young people to organize community food collection stands. Through local donations and partnerships with soup kitchens and food pantries, we make it easy for communities to share unused food with people who need it most. Our mission is to inspire youth leadership, strengthen communities, and ensure that surplus food reaches hungry individuals instead of going to waste.
          </p>
        </div>
        <MissionArt className="mx-auto w-full max-w-sm" />
      </section>
      <section className="mt-12 max-w-3xl border-t border-gray-200 pt-10" aria-labelledby="story-heading">
        <h2 id="story-heading" className="text-2xl font-bold">Our Story</h2>
        <div className="mt-4 space-y-4 leading-relaxed text-gray-600">
          <p>Food Stand in a Park is a non-profit organization founded by students in 2021 dedicated to collecting food to donate to those in need.</p>
          <p>We noticed that while many families had leftover food, others were suffering from hunger, so we created Food Stand in a Park to create a bridge between them. The purpose of our non-profit organization is to collect unwanted food to donate to people who need it, and we hope to be able to end hunger, one food stand at a time.</p>
          <p>Our goal is to be able to spread across multiple communities, so we want to recruit more students to set up food stands in their own communities, helping them become more confident in themselves by planning and organizing the food stands. Join us and set up your own food stand today!</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/volunteer/dashboard?tab=food-stand" className="btn-primary">Start a food stand</Link>
          <Link href="/donate" className="btn-secondary">Donate food</Link>
        </div>
      </section>
    </div>
  );
}
