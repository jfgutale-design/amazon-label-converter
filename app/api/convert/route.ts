import { NextResponse } from "next/server";
import { processPdfLabel } from "@/lib/pdf/processor";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const labelType = formData.get("labelType");
    const productTemplateId = formData.get("productTemplateId");

    const result = await processPdfLabel({ file, labelType, productTemplateId });

    return new NextResponse(result.fileBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Type": result.contentType,
        "X-Page-Count": result.pageCount.toString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to convert PDF.";

    return NextResponse.json({ message }, { status: 400 });
  }
}
