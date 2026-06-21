import { NextResponse } from "next/server";
import { processPdfLabel } from "@/lib/pdf/processor";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const labelType = formData.get("labelType");

    const result = await processPdfLabel({ file, labelType });

    return new NextResponse(result.zipBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Type": "application/zip",
        "X-Page-Count": result.pageCount.toString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to convert PDF.";

    return NextResponse.json({ message }, { status: 400 });
  }
}
