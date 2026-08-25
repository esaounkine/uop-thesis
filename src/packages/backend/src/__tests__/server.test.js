import { describe, expect, it, jest } from '@jest/globals';
import { restoreState } from '../server.js';

describe('restoreState', () => {
  it('interrupts jobs a dead process left running', () => {
    const jobRepositoryMock = {
      interruptRunningJobs: jest.fn(),
    };

    restoreState({
      jobRepository: jobRepositoryMock,
    });

    expect(jobRepositoryMock.interruptRunningJobs).toHaveBeenCalled();
  });
});
