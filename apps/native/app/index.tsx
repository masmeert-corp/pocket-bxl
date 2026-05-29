import { Container } from "@/components/container";
import { Button, Text } from "heroui-native";

export default function Home() {
  return (
    <Container className="p-6">
      <Text>Hello world</Text>
      <Button>Click me</Button>
    </Container>
  );
}
