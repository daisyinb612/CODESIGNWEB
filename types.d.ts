declare module "react-native-web" {
  export const Pressable: any;
  export const ScrollView: any;
  export const StyleSheet: { create<T extends Record<string, unknown>>(styles: T): T };
  export const Text: any;
  export const TextInput: any;
  export const View: any;
  export function useWindowDimensions(): { width: number; height: number };
}
