import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return (
    <div className="w-screen h-screen " data-tauri-drag-region>
      <Button size="sm" variant="outline">
        Small
      </Button>
    </div>
  );
}
