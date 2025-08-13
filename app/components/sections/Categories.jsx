import { Card, CardContent } from "../ui/card";
import { cn } from "../lib/utils";
import {
  Briefcase,
  ChartPie,
  Calendar,
  DollarSign,
  Heart,
  Book,
  Settings,
  Shield,
  Bell,
  MessageSquare,
  Star,
  Globe,
} from "lucide-react";

const items = [
  { label: "Work", icon: Briefcase },
  { label: "Analytics", icon: ChartPie },
  { label: "Calendar", icon: Calendar },
  { label: "Finance", icon: DollarSign },
  { label: "Health", icon: Heart },
  { label: "Library", icon: Book },
  { label: "Settings", icon: Settings },
  { label: "Security", icon: Shield },
  { label: "Alerts", icon: Bell },
  { label: "Messages", icon: MessageSquare },
  { label: "Favorites", icon: Star },
  { label: "Global", icon: Globe },
];

const Categories = () => {
  return (
    <section
      aria-labelledby="categories-title"
      className="container mx-auto px-4 py-10"
    >
      <header className="mb-6 flex items-center justify-between">
        <h2 id="categories-title" className="text-2xl font-semibold">
          Categories
        </h2>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map(({ label, icon: Icon }) => (
          <Card
            key={label}
            className={cn(
              "rounded-xl border transition-transform duration-200 hover:-translate-y-0.5"
            )}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center gap-3 aspect-square">
              <div className="inline-flex items-center justify-center size-10 rounded-lg bg-secondary">
                <Icon className="opacity-80" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default Categories;
