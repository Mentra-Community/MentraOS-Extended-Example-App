import { ToolCall, TpaServer, TpaSession } from '@mentra/sdk';
import path from 'path';
import { setupExpressRoutes } from './webview';
import { handleToolCall } from './tools';

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set in .env file'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set in .env file'); })();
const PORT = parseInt(process.env.PORT || '3000');

class ExampleMentraOSApp extends TpaServer {
  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
      publicDir: path.join(__dirname, '../public'),
    });

    // Set up Express routes
    setupExpressRoutes(this);
  }

  /** Map to store active user sessions */
  private userSessionsMap = new Map<string, TpaSession>();

  /**
   * Handles tool calls from the MentraOS system
   * @param toolCall - The tool call request
   * @returns Promise resolving to the tool call response or undefined
   */
  protected async onToolCall(toolCall: ToolCall): Promise<string | undefined> {
    return handleToolCall(toolCall, toolCall.userId, this.userSessionsMap.get(toolCall.userId));
  }

  /**
   * Handles new user sessions
   * Sets up event listeners and displays welcome message
   * @param session - The TPA session instance
   * @param sessionId - Unique session identifier
   * @param userId - User identifier
   */
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    this.userSessionsMap.set(userId, session);

    // Show welcome message
    session.layouts.showTextWall("Example App loaded!");

    /**
     * Handles transcription display based on settings
     * @param text - The transcription text to display
     */
    const displayTranscription = (text: string): void => {
      const showLiveTranscription = session.settings.get<boolean>('show_live_transcription', true);
      if (showLiveTranscription) {
        console.log("Transcript received:", text);
        session.layouts.showTextWall("You said: " + text);
      }
    };

    // Listen for transcriptions
    const transcriptionHandler = session.events.onTranscription((data) => {
      if (data.isFinal) {
        // Handle final transcription text
        displayTranscription(data.text);
      }
    });
    // automatically remove the transcription handler when the session ends
    this.addCleanupHandler(transcriptionHandler);

    // Listen for setting changes to update transcription display behavior
    const settingsChangeHandler = session.settings.onValueChange(
      'show_live_transcription',
      (newValue: boolean, oldValue: boolean) => {
        console.log(`Live transcription setting changed from ${oldValue} to ${newValue}`);
        if (newValue) {
          console.log("Live transcription display enabled");
        } else {
          console.log("Live transcription display disabled");
        }
      }
    );
    // Automatically remove the settings change handler when the session ends
    this.addCleanupHandler(settingsChangeHandler);

    // Listen for errors
    const errorHandler = session.events.onError((error) => {
      console.error('Error:', error);
      this.userSessionsMap.delete(userId);
    });
    // automatically remove the error handler when the session ends
    this.addCleanupHandler(errorHandler);

    // automatically remove the session when the session ends
    this.addCleanupHandler(() => {
      this.userSessionsMap.delete(userId);
    });
  }
}

// Start the server
const app = new ExampleMentraOSApp();

app.start().catch(console.error);