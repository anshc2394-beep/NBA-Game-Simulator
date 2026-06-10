import * as readline from 'readline';
import { GameSimulator } from './gameSimulator';
import { Team } from './team';
import { Player } from './player';
import { playersData } from './data/players';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function prompt(question: string): Promise<string> {
    return new Promise(resolve => rl.question(question, resolve));
}

function parsePlayerIndexes(input: string): number[] {
    return input
        .split(/[\s,]+/)
        .map(item => Number(item.trim()))
        .filter(index => !Number.isNaN(index));
}

function validateIndexes(indexes: number[]): void {
    if (indexes.length !== 5) {
        throw new Error('You must select exactly 5 player indexes.');
    }
    for (const index of indexes) {
        if (index < 0 || index >= playersData.length) {
            throw new Error(`Player index ${index} is out of bounds.`);
        }
    }
}

function createTeam(name: string, indexes: number[]): Team {
    validateIndexes(indexes);
    const team = new Team(name);
    indexes.forEach(index => {
        const player = playersData[index];
        team.addPlayer(new Player(player.name, player.position, player.rating));
    });
    return team;
}

function printPlayerPool(): void {
    console.log('Available NBA Players:');
    playersData.forEach((player, index) => {
        console.log(`${index}: ${player.name} (${player.position}) - Rating ${player.rating} - ${player.team}`);
    });
    console.log('');
}

async function selectTeam(teamName: string): Promise<number[]> {
    while (true) {
        const answer = await prompt(`${teamName} player indexes (5 values separated by commas): `);
        try {
            const indexes = parsePlayerIndexes(answer);
            validateIndexes(indexes);
            return indexes;
        } catch (error) {
            console.error('Invalid selection:', (error as Error).message);
        }
    }
}

async function runSimulation() {
    try {
        const [teamAArg, teamBArg] = process.argv.slice(2);
        let teamAIndexes: number[];
        let teamBIndexes: number[];

        printPlayerPool();

        if (teamAArg && teamBArg) {
            teamAIndexes = parsePlayerIndexes(teamAArg);
            teamBIndexes = parsePlayerIndexes(teamBArg);
            validateIndexes(teamAIndexes);
            validateIndexes(teamBIndexes);
        } else {
            teamAIndexes = await selectTeam('Team A');
            teamBIndexes = await selectTeam('Team B');
        }

        if (teamAIndexes.some(index => teamBIndexes.includes(index))) {
            throw new Error('A player cannot be selected for both teams.');
        }

        const teamA = createTeam('Team A', teamAIndexes);
        const teamB = createTeam('Team B', teamBIndexes);
        const simulator = new GameSimulator(teamA, teamB);
        const result = simulator.simulateGame();

        console.log('\n=== Simulation Result ===');
        console.log(`Winner: ${result.winner}`);
        console.log(`Score A: ${result.scoreA} | Score B: ${result.scoreB}`);
        console.log('Prediction:', result.prediction);
        console.log('Model weights after training:', result.modelWeights);
        console.log('\nTeam A Stats:');
        console.table(result.playerStats.teamA.map(player => ({
            name: player.name,
            position: player.position,
            rating: player.rating,
            points: player.statistics.points,
            assists: player.statistics.assists,
            rebounds: player.statistics.rebounds,
            steals: player.statistics.steals,
            blocks: player.statistics.blocks,
        })));
        console.log('Team B Stats:');
        console.table(result.playerStats.teamB.map(player => ({
            name: player.name,
            position: player.position,
            rating: player.rating,
            points: player.statistics.points,
            assists: player.statistics.assists,
            rebounds: player.statistics.rebounds,
            steals: player.statistics.steals,
            blocks: player.statistics.blocks,
        })));
    } catch (error) {
        console.error('Simulation failed:', (error as Error).message);
    } finally {
        rl.close();
    }
}

runSimulation();
