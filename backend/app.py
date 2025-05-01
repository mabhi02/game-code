from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import anthropic
import json
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Anthropic client with the API key
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Game state storage (in memory for simplicity)
# In a production app, you would use a database
game_sessions = {}

def extract_json(text):
    """Extract JSON from text that might contain additional content."""
    # Try to find JSON content using regex
    json_match = re.search(r'({[\s\S]*})', text)
    if json_match:
        json_str = json_match.group(1)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass
    
    # If regex fails, try to find the start of the JSON object
    try:
        json_start = text.find('{')
        if json_start >= 0:
            return json.loads(text[json_start:])
    except json.JSONDecodeError:
        pass
    
    # If all else fails, raise an error
    raise ValueError("Could not extract valid JSON from response")

@app.route('/api/start-game', methods=['POST'])
def start_game():
    data = request.json
    player_name = data.get('playerName', 'Adventurer')
    game_setting = data.get('gameSetting', 'fantasy')
    story_prompt = data.get('storyPrompt', '')
    
    # Generate a unique session ID
    import uuid
    session_id = str(uuid.uuid4())
    
    # Create initial prompt for Claude
    initial_prompt = f"""
    You are the game engine for MiniQuest, an AI-powered top-down 2D adventure game similar to Legend of Zelda: Link's Awakening in style, but with unique content.
    
    STORY PREMISE:
    {story_prompt}
    
    GAME SETTING:
    {game_setting}

    Your role is to:
    1. Create a detailed and coherent world based on the story premise and setting
    2. Generate engaging narrative content and descriptions
    3. Design appropriate characters, items, and environments for this specific story world
    4. Create a consistent visual theme (using emoji or text representations of game elements)
    5. Design appropriate game mechanics for this world
    6. Track player inventory, stats, and progress
    
    The player's name is {player_name}. Create an introductory scene that:
    - Establishes the setting and tone of the game based on the story prompt
    - Introduces the player's character and initial situation
    - Presents 3-4 initial actions the player can take
    
    You must return a JSON object that includes:
    1. A "spriteSet" with appropriate visual representations for this game world
    2. World elements appropriate to the story and setting

    Format your response as a JSON object with the following structure:
    {{
        "narrative": "Detailed description of the current scene",
        "player": {{
            "name": "{player_name}",
            "stats": {{Key player statistics appropriate for this game setting}},
            "inventory": [List of items the player starts with]
        }},
        "actions": [List of 3-4 possible actions for the player],
        "gameState": {{Any additional state information to track}},
        "spriteSet": {{
            "PLAYER": "emoji or character representing the player",
            "NPC": "emoji for NPCs",
            "ENEMY": "emoji for enemies",
            "ITEM": "emoji for standard items",
            "TERRAIN": {{terrain types and their visual representations}},
            "SPECIAL": {{special game elements specific to this world}}
        }},
        "worldTheme": "A short description of the visual style and theme of this world"
    }}
    
    IMPORTANT: YOUR RESPONSE MUST BE VALID JSON WITH NO OTHER TEXT BEFORE OR AFTER. DO NOT ADD ANY EXPLANATIONS OUTSIDE THE JSON.
    """
    
    # Call Claude API
    try:
        # Updated to use newer anthropic library
        response = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=4000,
            temperature=0.7,
            system="You are a game engine that generates content in valid JSON format. Your responses must ONLY contain a valid JSON object with no additional text.",
            messages=[
                {"role": "user", "content": initial_prompt}
            ]
        )
        
        # Parse Claude's response as JSON
        response_content = response.content[0].text
        print(f"Claude response: {response_content}")
        
        # Extract the JSON part from the response
        game_data = extract_json(response_content)
        
        # Store game state
        game_sessions[session_id] = {
            "history": [
                {"role": "system", "content": "You are a game engine that generates content in valid JSON format."},
                {"role": "user", "content": initial_prompt},
                {"role": "assistant", "content": response_content}
            ],
            "player": game_data["player"],
            "gameState": game_data.get("gameState", {}),
            "spriteSet": game_data.get("spriteSet", {}),
            "worldTheme": game_data.get("worldTheme", "")
        }
        
        return jsonify({
            "sessionId": session_id,
            "gameData": game_data
        })
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/action', methods=['POST'])
def take_action():
    data = request.json
    session_id = data.get('sessionId')
    action = data.get('action')
    
    if not session_id or not action or session_id not in game_sessions:
        return jsonify({"error": "Invalid session or missing action"}), 400
    
    game_session = game_sessions[session_id]
    history = game_session["history"]
    player = game_session["player"]
    game_state = game_session["gameState"]
    sprite_set = game_session.get("spriteSet", {})
    world_theme = game_session.get("worldTheme", "")
    
    # Create prompt for Claude
    action_prompt = f"""
    The player has chosen to: {action}
    
    Based on the game state, history, and world theme, generate the next scene in the adventure.
    Consider how this action affects the world, NPCs, and the player's situation.
    
    World Theme: {world_theme}
    
    Current player stats and inventory:
    {json.dumps(player, indent=2)}
    
    Current game state:
    {json.dumps(game_state, indent=2)}
    
    Available sprites:
    {json.dumps(sprite_set, indent=2)}
    
    Format your response as a JSON object with the following structure:
    {{
        "narrative": "Detailed description of what happens next",
        "player": {{Updated player stats and inventory}},
        "actions": [List of 3-4 new possible actions for the player],
        "gameState": {{Updated game state information}}
    }}
    
    You may also update the sprite set if needed by including a "spriteSet" object.
    
    IMPORTANT: YOUR RESPONSE MUST BE VALID JSON WITH NO OTHER TEXT BEFORE OR AFTER. DO NOT ADD ANY EXPLANATIONS OUTSIDE THE JSON.
    """
    
    # Add the user's action to history
    history.append({"role": "user", "content": action_prompt})
    
    # Call Claude API
    try:
        # Prepare the message array for Claude
        messages = []
        
        # Add the system message
        system_message = "You are a game engine that generates content in valid JSON format. Your responses must ONLY contain a valid JSON object with no additional text."
        
        # Add previous exchanges, skipping the system message that might be at position 0
        start_idx = 1 if history[0]["role"] == "system" else 0
        for i in range(start_idx, len(history)-1, 2):
            messages.append({
                "role": "user", 
                "content": history[i]["content"]
            })
            messages.append({
                "role": "assistant", 
                "content": history[i+1]["content"]
            })
        
        # Add the latest user message
        messages.append({"role": "user", "content": history[-1]["content"]})
        
        # Updated to use newer anthropic library
        response = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=4000,
            temperature=0.7,
            system=system_message,
            messages=messages
        )
        
        # Parse Claude's response as JSON
        response_content = response.content[0].text
        print(f"Claude response: {response_content}")
        
        # Extract the JSON part from the response
        game_data = extract_json(response_content)
        
        # Update game state
        history.append({"role": "assistant", "content": response_content})
        game_sessions[session_id]["player"] = game_data["player"]
        game_sessions[session_id]["gameState"] = game_data.get("gameState", {})
        
        # Update sprite set if provided
        if "spriteSet" in game_data:
            game_sessions[session_id]["spriteSet"] = game_data["spriteSet"]
        
        return jsonify({
            "gameData": game_data
        })
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 