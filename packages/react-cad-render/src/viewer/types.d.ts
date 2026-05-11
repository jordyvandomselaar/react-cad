import type { ReactThreeFiber } from "@react-three/fiber";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ReactThreeFiber.ThreeElements {}
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends ReactThreeFiber.ThreeElements {}
  }
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    interface IntrinsicElements extends ReactThreeFiber.ThreeElements {}
  }
}
