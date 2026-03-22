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
    const response = await fetch("./Question.json");

    if (!response.ok) {
      throw new Error(`Failed to fetch Question.json: ${response.status}`);
    }

    const raw = await response.text();
    console.log("RAW FILE CONTENT:", raw);

    const parsed = JSON.parse(raw);
    const decodedString = base64ToUtf8(parsed.data);
    const questions = JSON.parse(decodedString);

    return questions;
  } catch (error) {
    console.error("Error loading questions:", error);
    return [];
  }
}