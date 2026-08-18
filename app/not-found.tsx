import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="page-container">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <h1 className="page-title">Out of bounds</h1>
        <p className="page-subtitle">
          There's nothing here. There is only ever the one page.
        </p>
        <Button asChild>
          <Link href="/">Back to the tee</Link>
        </Button>
      </div>
    </main>
  );
}
