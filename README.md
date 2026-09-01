# BrickBuddy Family Co-Design Website

A pre-use co-design research tool for children aged 6–11 and their parents. The interface is built with React Native Web. Study data stays in the current browser and can be exported as JSON or CSV.

## Run locally

Requires Node.js 22.13 or later.

```bash
npm install
npm run build
npm start
```

Open the local address shown in the terminal. Before a formal session, start a new session and make sure the browser allows file downloads.

## Study flow

1. The researcher enters an anonymous ID and demographic information for the child and parent.
2. The child completes a simple tap practice.
3. The researcher asks about a recent build, conversation, instruction format, navigation order, and automatic page turning.
4. The child describes their experience with AI and Doubao’s voice-call feature.
5. After a standard AI explanation, the child answers four building scenarios.
6. The child chooses AI roles, button controls, and voice interruptions.
7. The parent makes their own role and control choices.
8. The parent describes recording preferences and expectations for AI help.
9. The parent and child decide together whether to keep one proposal or combine them.
10. The researcher asks semi-structured questions about timing, content, length, and control recovery.
11. The researcher exports the record as JSON or CSV in the browser.

The Researcher button opens the facilitation panel at any time. The page does not request camera, microphone, or network permissions.

The study navigation at the bottom moves to the previous or next page or opens the full study directory. Jumping between steps does not clear completed answers.

## Validation

```bash
npm test
```

The test runs a production build and checks the study flow, local saving, and export fields.
