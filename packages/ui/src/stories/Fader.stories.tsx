import type { Meta, StoryObj } from "@storybook/react";
import { Fader } from "../components/controls";

const meta = {
  title: "Controls/Fader",
  component: Fader,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    color: { control: "color" },
  },
} satisfies Meta<typeof Fader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  args: {
    value: 0.75,
    orientation: "vertical",
    size: "md",
    label: "Volume",
  },
};

export const Horizontal: Story = {
  args: {
    value: 0.3,
    orientation: "horizontal",
    size: "md",
    label: "Pan",
  },
};

export const Small: Story = {
  args: {
    value: 0.5,
    size: "sm",
    label: "Send",
  },
};

export const Large: Story = {
  args: {
    value: 0.8,
    size: "lg",
    label: "Master",
  },
};

export const CustomSize_1x2: Story = {
  args: {
    value: 0.5,
    label: "Send A",
    style: { width: 80, height: 200 },
  },
};

export const FlexContainer: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          display: "flex",
          width: 300,
          height: 300,
          border: "1px dashed #444",
          alignItems: "stretch",
          gap: 10,
          padding: 10,
        }}
      >
        <Story />
        <Story />
      </div>
    ),
  ],
  args: {
    value: 0.6,
    label: "Flex",
    style: { width: "100%", height: "auto", flex: 1 },
  },
};
