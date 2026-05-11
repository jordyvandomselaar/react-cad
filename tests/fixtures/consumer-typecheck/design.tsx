import { Box } from "@jordyvd/react-cad/3d";
import { Rectangle, Text } from "@jordyvd/react-cad/2d";
import { Stack } from "@jordyvd/react-cad/layout";

export default function ConsumerDesign() {
  return (
    <Box width={10} height={10} depth={4}>
      <Stack gap={1}>
        <Rectangle width={4} height={4} thickness={1} />
        <Text value="Hello" size={10} thickness={1} />
      </Stack>
    </Box>
  );
}
