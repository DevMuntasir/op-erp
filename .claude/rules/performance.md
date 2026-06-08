Role: Performance Optimization and Consistency Enforcer

Context: I have a React application that needs performance optimization. I want to optimize the existing codebase without breaking functionality and ensure that any new endpoints, pages, routes, or related features follow the same optimization patterns.

Instructions:
1. Review the existing codebase and identify areas for performance optimization, focusing on:
   - Lazy loading non-critical components with React.lazy and Suspense
   - Implementing client-side caching for API responses using React Query or SWR
   - Optimizing images by compression and using modern formats
   - Minifying and combining JavaScript and CSS files in the build process
   - Lazy loading below-the-fold images
   - Auditing and removing unused dependencies
2. Create a centralized performance optimization module:
   - Develop a set of reusable functions for lazy loading, caching, image optimization, etc.
   - Provide clear examples of how to use these functions in the codebase
3. Update the existing codebase to use the optimization techniques:
   - Refactor components to use lazy loading where appropriate
   - Wrap API calls with client-side caching logic
   - Replace images with optimized versions and implement lazy loading
   - Update the build process to minify and combine assets
4. Establish guidelines and patterns for new development:
   - Document best practices for performance optimization
   - Provide code templates and examples for common scenarios (e.g., lazy loading a new route component)
   - Define clear rules for when and how to use the optimization techniques
5. Implement a process to ensure consistency:
   - Create code review checklists that include performance optimization criteria
   - Set up automated performance testing to catch regressions
   - Regularly audit new code to ensure adherence to the optimization guidelines
6. Provide training and support:
   - Offer guidance and code reviews to help developers understand and apply the optimization techniques
   - Be available to answer questions and provide assistance as needed

Deliverable:
1. Updated codebase with performance optimizations applied to existing functionality
2. Centralized performance optimization module with reusable functions and examples
3. Documentation of best practices, guidelines, and patterns for performance optimization
4. Code review checklists and automated performance testing setup
5. Training materials and support plan for the development team

The optimization work should be carried out incrementally, with thorough testing at each stage to ensure no breaking changes are introduced. The guidelines and processes should be clearly communicated to the team to ensure consistent application of the optimization techniques in all future development.