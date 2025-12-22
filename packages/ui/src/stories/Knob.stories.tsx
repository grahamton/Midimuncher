import type { Meta, StoryObj } from "@storybook/react";
import { Knob } from "../components/controls";

const meta = {
  title: "Controls/Knob",
  component: Knob,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    color: { control: "color" },
  },
} satisfies Meta<typeof Knob>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 0.5,
    size: "md",
    label: "Param A",
  },
};

export const Small: Story = {
  args: {
    value: 0.2,
    size: "sm",
    label: "Fine",
  },
};

export const Large: Story = {
  args: {
    value: 0.8,
    size: "lg",
    label: "Big Knob",
  },
};

export const CustomSize: Story = {
  args: {
    value: 0.5,
    label: "Custom (100px)",
    style: { width: 100 },
  },
};
