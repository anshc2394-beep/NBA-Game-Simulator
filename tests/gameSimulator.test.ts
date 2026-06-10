import { GameSimulator } from '../src/gameSimulator';
import { Team } from '../src/team';
import { Player } from '../src/player';

describe('GameSimulator', () => {
    let teamA: Team;
    let teamB: Team;
    let gameSimulator: GameSimulator;

    beforeEach(() => {
        teamA = new Team('Team A');
        teamB = new Team('Team B');

        teamA.addPlayer(new Player('Player A1', 'Guard', 92));
        teamA.addPlayer(new Player('Player A2', 'Forward', 90));
        teamA.addPlayer(new Player('Player A3', 'Center', 91));
        teamA.addPlayer(new Player('Player A4', 'Guard', 89));
        teamA.addPlayer(new Player('Player A5', 'Forward', 88));

        teamB.addPlayer(new Player('Player B1', 'Guard', 91));
        teamB.addPlayer(new Player('Player B2', 'Forward', 90));
        teamB.addPlayer(new Player('Player B3', 'Center', 89));
        teamB.addPlayer(new Player('Player B4', 'Guard', 88));
        teamB.addPlayer(new Player('Player B5', 'Forward', 87));

        gameSimulator = new GameSimulator(teamA, teamB);
    });

    test('should determine a winner based on simulated scores', () => {
        const result = gameSimulator.simulateGame();
        expect(['Team A', 'Team B']).toContain(result.winner);
    });

    test('should generate player statistics after simulation', () => {
        const result = gameSimulator.simulateGame();
        expect(result.playerStats.teamA).toHaveLength(5);
        expect(result.playerStats.teamB).toHaveLength(5);
        expect(result.playerStats.teamA[0].statistics.points).toBeGreaterThanOrEqual(0);
        expect(result.playerStats.teamB[0].statistics.points).toBeGreaterThanOrEqual(0);
    });
});
