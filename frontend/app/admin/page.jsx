"use client";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useUser } from "../utils/auth";
import Overview from "./Overview";
import Fixtures from "./Fixtures";
import Markets from "./Markets";
import Players from "./Players";
import Users from "./Users";
import SettingsPanel from "./SettingsPanel";

export default function AdminPage() {
  const { isLoaded, isSignedIn, isAdmin } = useUser();
  if (!isLoaded) return <div className="min-h-screen pt-32 text-center text-muted-foreground">Loading…</div>;
  if (!isSignedIn) return <div className="min-h-screen pt-32 text-center">Please <Link className="underline" href="/sign-in">sign in</Link>.</div>;
  if (!isAdmin) return <div className="min-h-screen pt-32 text-center text-muted-foreground">Admin access required.</div>;
  return (
    <div className="min-h-screen pt-24 pb-10 px-4 container mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold mb-4">Admin</h1>
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          {["overview", "fixtures", "markets", "players", "users", "settings"].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview"><Overview /></TabsContent>
        <TabsContent value="fixtures"><Fixtures /></TabsContent>
        <TabsContent value="markets"><Markets /></TabsContent>
        <TabsContent value="players"><Players /></TabsContent>
        <TabsContent value="users"><Users /></TabsContent>
        <TabsContent value="settings"><SettingsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
