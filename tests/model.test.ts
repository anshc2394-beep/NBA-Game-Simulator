import { StatsModel } from '../src/model/statsModel';
import { Team } from '../src/team';
import { Player } from '../src/player';

describe('StatsModel', () => {
    it('returns a valid win probability between 0 and 1', () => {
        const teamA = new Team('Team A');
        const teamB = new Team('Team B');

        teamA.addPlayer(new Player('Player A1', 'Guard', 90));
        teamA.addPlayer(new Player('Player A2', 'Forward', 88));
        teamA.addPlayer(new Player('Player A3', 'Center', 87));
        teamA.addPlayer(new Player('Player A4', 'Guard', 86));
        teamA.addPlayer(new Player('Player A5', 'Forward', 85));

        teamB.addPlayer(new Player('Player B1', 'Guard', 90));
        teamB.addPlayer(new Player('Player B2', 'Forward', 88));
        teamB.addPlayer(new Player('Player B3', 'Center', 87));
        teamB.addPlayer(new Player('Player B4', 'Guard', 86));
        teamB.addPlayer(new Player('Player B5', 'Forward', 85));

        const model = new StatsModel();
        const prediction = model.predict(teamA, teamB);

        expect(prediction.teamAWinProbability).toBeGreaterThanOrEqual(0);
        expect(prediction.teamAWinProbability).toBeLessThanOrEqual(1);
    });

    it('updates model weights after training', () => {
        const teamA = new Team('Team A');
        const teamB = new Team('Team B');

        teamA.addPlayer(new Player('Player A1', 'Guard', 95));
        teamA.addPlayer(new Player('Player A2', 'Forward', 94));
        teamA.addPlayer(new Player('Player A3', 'Center', 93));
        teamA.addPlayer(new Player('Player A4', 'Guard', 92));
        teamA.addPlayer(new Player('Player A5', 'Forward', 91));

        teamB.addPlayer(new Player('Player B1', 'Guard', 85));
        teamB.addPlayer(new Player('Player B2', 'Forward', 84));
        teamB.addPlayer(new Player('Player B3', 'Center', 83));
        teamB.addPlayer(new Player('Player B4', 'Guard', 82));
        teamB.addPlayer(new Player('Player B5', 'Forward', 81));

        const model = new StatsModel();
        const before = model.getWeights();
        model.train(teamA, teamB, teamA.name);
        const after = model.getWeights();

        expect(after.bias).not.toEqual(before.bias);
        expect(after.ratingDiffWeight).not.toEqual(before.ratingDiffWeight);
    });
});
