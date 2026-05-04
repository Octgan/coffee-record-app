declare module "react-simple-maps" {
  import type { CSSProperties, ReactNode } from "react";

  export interface RsmGeography {
    rsmKey: string;
    properties: { name?: string; NAME?: string; [key: string]: unknown };
    [key: string]: unknown;
  }

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: { scale?: number };
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
  }

  export const ComposableMap: (props: ComposableMapProps) => ReactNode;

  export interface GeographiesProps {
    geography: string;
    children?: (arg: { geographies: RsmGeography[] }) => ReactNode;
  }

  export const Geographies: (props: GeographiesProps) => ReactNode;

  export interface GeographyStyleState {
    default?: CSSProperties;
    hover?: CSSProperties;
    pressed?: CSSProperties;
  }

  export interface GeographyProps {
    geography: RsmGeography;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: () => void;
    style?: GeographyStyleState;
  }

  export const Geography: (props: GeographyProps) => ReactNode;
}
