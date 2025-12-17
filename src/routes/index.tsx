import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return (
    <div className="w-screen h-screen " data-tauri-drag-region>
      <Button size="sm" variant="link">
        okey_ai
      </Button>
    </div>
  );
}
