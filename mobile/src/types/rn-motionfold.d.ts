declare module 'rn-motionfold' {
  import { ComponentType, ReactNode } from 'react';
  import { ViewProps } from 'react-native';

  export interface DepthTunnelProps extends ViewProps {
    items?: any[];
    cycleDuration?: number;
    prefill?: boolean;
    layers?: number;
    children?: ReactNode | ((item: any) => ReactNode);
    [key: string]: any;
  }
  export interface DepthTunnelItem {
    depth?: number;
    children?: ReactNode;
    [key: string]: any;
  }
  export const DepthTunnel: ComponentType<DepthTunnelProps>;

  export interface CurtainRevealProps extends ViewProps {
    children?: ReactNode;
    [key: string]: any;
  }
  export type CurtainExit = 'up' | 'down' | 'left' | 'right';
  export const CurtainReveal: ComponentType<CurtainRevealProps>;

  export interface StaggerRevealProps extends ViewProps {
    children?: ReactNode;
    [key: string]: any;
  }
  export interface StaggerItemProps extends ViewProps {
    children?: ReactNode;
    [key: string]: any;
  }
  export type RevealDirection = 'up' | 'down' | 'left' | 'right';
  export const StaggerReveal: ComponentType<StaggerRevealProps>;
  export const StaggerItem: ComponentType<StaggerItemProps>;

  export interface ParallaxScrollProps extends ViewProps {
    headerHeight?: number;
    children?: ReactNode;
    [key: string]: any;
  }
  export interface ParallaxLayerProps extends ViewProps {
    children?: ReactNode;
    [key: string]: any;
  }
  export const ParallaxScroll: ComponentType<ParallaxScrollProps>;
  export const ParallaxLayer: ComponentType<ParallaxLayerProps>;

  export interface GlowBorderProps extends ViewProps {
    children?: ReactNode;
    [key: string]: any;
  }
  export const GlowBorder: ComponentType<GlowBorderProps>;

  export interface StrokeDrawProps extends ViewProps {
    children?: ReactNode;
    [key: string]: any;
  }
  export interface CheckmarkDrawProps extends ViewProps {
    children?: ReactNode;
    [key: string]: any;
  }
  export const StrokeDraw: ComponentType<StrokeDrawProps>;
  export const CheckmarkDraw: ComponentType<CheckmarkDrawProps>;
}
