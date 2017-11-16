import dependencyMapper from '../dependency-mapper';

jest.mock('../__mocks__/pacote');

describe('dependency-mapper', () => {
  it('can filter dependencies', async () => {
    const dependencies = { 'react-scripts': '3.1.2' };
    const filteredDependencies = await dependencyMapper(dependencies);

    expect(filteredDependencies).toEqual({});
  });

  it('can get absolute versions of dependencies', async () => {
    const dependencies = { react: '^15.0.0' };
    const filteredDependencies = await dependencyMapper(dependencies);

    expect(filteredDependencies).toEqual({ react: '15.5.4' });
  });

  it('can get absolute versions and also filter', async () => {
    const dependencies = { 'react-scripts': '3.1.2', react: '^15.0.0' };
    const filteredDependencies = await dependencyMapper(dependencies);

    expect(filteredDependencies).toEqual({ react: '15.5.4' });
  });
});
