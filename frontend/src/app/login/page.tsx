import { redirect } from "next/navigation";

/**
 * This page exists solely to capture rogue redirects to /login 
 * and send users back to the root page where the LoginScreen is rendered.
 * Having this file physically exist prevents a 404 from ever occurring.
 */
export default function LoginPage() {
    // Server-side redirect
    redirect("/");
}
