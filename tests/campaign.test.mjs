import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignChapters, validateCampaign } from '../public/content/campaign.mjs';
import { applyCampaignEvent, chapterComplete, createCampaignState, objectiveAvailable } from '../public/engine/campaign.mjs';

test('campaign content has unique, reachable local requirements', () => {
  assert.deepEqual(validateCampaign(campaignChapters), []);
});

test('objectives reject completion before requirements and grant rewards once', () => {
  let state = createCampaignState();
  assert.equal(objectiveAvailable(state, 'root-relay-west'), false);
  assert.equal(applyCampaignEvent(state, { type: 'complete', objectiveId: 'root-relay-west' }).changed, false);
  for (const id of ['root-companion', 'root-relay-west', 'root-relay-east', 'root-guard']) {
    const result = applyCampaignEvent(state, { type: 'complete', objectiveId: id });
    assert.equal(result.changed, true);
    state = result.state;
  }
  assert.equal(chapterComplete(state, 'root'), true);
  assert.deepEqual(state.rewardsClaimed, ['root-shortcut']);
  assert.equal(applyCampaignEvent(state, { type: 'complete', objectiveId: 'root-guard' }).changed, false);
});

