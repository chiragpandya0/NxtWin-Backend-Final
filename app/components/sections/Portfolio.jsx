import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const items = [
  { title: "Acme Growth Fund", amount: "$8,240", status: "Active" },
  { title: "Tech Momentum", amount: "$5,120", status: "Watch" },
  { title: "Healthcare ETF", amount: "$2,460", status: "Active" },
  { title: "Emerging Markets", amount: "$1,980", status: "Paused" },
  { title: "Green Energy", amount: "$3,540", status: "Active" },
];

const Portfolio = () => {
  return (
    <section
      aria-labelledby="portfolio-title"
      className="container mx-auto px-4 py-10"
    >
      <header className="mb-6 flex items-center justify-between">
        <h2 id="portfolio-title" className="text-2xl font-semibold">
          Portfolio
        </h2>
      </header>
      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.title} className="rounded-xl border">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.amount}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{item.status}</Badge>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default Portfolio;
