import { CaseRepository } from './case.repository';

describe('CaseRepository', () => {
  let repository: CaseRepository;

  beforeEach(() => {
    repository = new CaseRepository();
  });

  it('creates a case with generated metadata', async () => {
    const created = await repository.create({
      title: 'Frontend onboarding',
      description: 'Initial integration case',
    });

    expect(created).toEqual({
      id: expect.any(String),
      title: 'Frontend onboarding',
      description: 'Initial integration case',
      cardIds: [],
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('returns cases in reverse creation order', async () => {
    const first = await repository.create({
      title: 'First',
      description: 'Case one',
    });
    const second = await repository.create({
      title: 'Second',
      description: 'Case two',
    });

    const cases = await repository.findAll();

    expect(cases).toHaveLength(2);
    expect(cases[0]?.id).toBe(second.id);
    expect(cases[1]?.id).toBe(first.id);
  });

  it('finds a case by id', async () => {
    const created = await repository.create({
      title: 'Lookup',
      description: 'Find this case',
    });

    await expect(repository.findById(created.id)).resolves.toEqual(created);
    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('updates a case by id', async () => {
    const created = await repository.create({
      title: 'Before',
      description: 'Original',
    });

    const updated = await repository.update(created.id, {
      description: 'Changed',
    });

    expect(updated).toEqual({
      ...created,
      description: 'Changed',
      updatedAt: expect.any(String),
    });
  });

  it('removes a case by id', async () => {
    const created = await repository.create({
      title: 'Remove',
      description: 'Delete this case',
    });

    await expect(repository.remove(created.id)).resolves.toBe(true);
    await expect(repository.findAll()).resolves.toEqual([]);
    await expect(repository.remove(created.id)).resolves.toBe(false);
  });
});
