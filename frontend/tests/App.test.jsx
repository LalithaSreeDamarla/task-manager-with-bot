import { render, screen } from "@testing-library/react";
import App from "../src/App.jsx";

test("renders Task Manager UI", () => {
  render(<App />);
  // change the text below to something present in your UI
  expect(screen.getByText(/task manager/i)).toBeInTheDocument();
});
