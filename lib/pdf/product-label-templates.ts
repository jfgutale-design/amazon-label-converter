export type ProductLabelTemplate = {
  id: string;
  name: string;
  description: string;
  columns: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  columnPitchMm: number;
  rowPitchMm: number;
};

export const productLabelTemplates = [
  {
    id: "amazon-a4-27up-63_5x29_6",
    name: "Amazon A4 27-up FNSKU",
    description: "3 columns x 9 rows, 63.5mm x 29.6mm labels",
    columns: 3,
    rows: 9,
    labelWidthMm: 63.5,
    labelHeightMm: 29.6,
    columnPitchMm: 66,
    rowPitchMm: 29.6,
  },
] as const satisfies ProductLabelTemplate[];

export const defaultProductLabelTemplateId = productLabelTemplates[0].id;

export function getProductLabelTemplate(templateId: string) {
  return productLabelTemplates.find((template) => template.id === templateId);
}
