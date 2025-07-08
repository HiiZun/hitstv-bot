import { REST, Routes } from 'discord.js';
import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function deployCommands() {
  const commands = [];
  
  // Validate required environment variables
  if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    console.error('Missing required environment variables: DISCORD_TOKEN and CLIENT_ID');
    console.error('Please check your .env file');
    return;
  }
  
  // Load commands
  const commandsPath = join(__dirname, 'commands');
  console.log('Looking for commands in:', commandsPath);
  const commandFiles = await readdir(commandsPath);
  
  for (const file of commandFiles.filter(file => file.endsWith('.js'))) {
    const filePath = join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    
    if ('data' in command) {
      commands.push(command.data.toJSON());
    }
  }
  
  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    
    // Deploy commands globally
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
}

// Deploy commands if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  deployCommands();
}
