import type { Question } from "../types/question";

function base64ToUtf8(base64: string): string {
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(base64), (c: string) =>
        "%" + c.charCodeAt(0).toString(16).padStart(2, "0")
      )
      .join("")
  );
}

export async function loadQuestions(): Promise<Question[]> {
  try {
    const response = await fetch("/Question.json");
    const json = await response.json();

    if (!json.data) {
      return [];
    }

    const decoded = base64ToUtf8(json.data);
    const questions: Question[] = JSON.parse(decoded);

    return questions;
  } catch (error) {
    console.error("Error loading questions:", error);
    return [];
  }
}